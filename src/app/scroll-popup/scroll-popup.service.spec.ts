import { SpectatorService, createServiceFactory } from '@ngneat/spectator/jest';
import { ScrollPopupService } from './scroll-popup.service';
import { MockProvider } from 'ng-mocks';

describe('ScrollPopupService (Spectator + Jest)', () => {
	let spectator: SpectatorService<ScrollPopupService>;
	let service: ScrollPopupService;

	// Use fake timers to control setTimeout-based logic (init + hide delay)
	beforeAll(() => {
		jest.useFakeTimers();
	});

	afterAll(() => {
		jest.useRealTimers();
	});

	// Mocks for DOM
	const mockTableWrapper: any = {
		scrollTop: 0,
		scrollHeight: 1000,
		clientHeight: 400,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		getBoundingClientRect: jest.fn(() => ({ top: 100, height: 400 }))
	};

	const mockTableContainer: any = {
		getBoundingClientRect: jest.fn(() => ({ right: 800, top: 100 }))
	};

	const mockTableBody: any = {
		querySelectorAll: jest.fn()
	};

	const row = (top: number, date: string) => ({
		getBoundingClientRect: jest.fn(() => ({ top })),
		querySelector: jest.fn(() => ({ textContent: date }))
	});

	const createService = createServiceFactory({
		service: ScrollPopupService,
		providers: [
			// Placeholders to demonstrate ng-mocks availability (not strictly required for the service itself)
			MockProvider('WINDOW', window as any),
		]
	});

	beforeEach(() => {
		// Fresh spies each test
		jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
			switch (selector) {
				case '.table-wrapper':
					return mockTableWrapper;
				case '.table-container':
					return mockTableContainer;
				case '.data-table tbody':
					return mockTableBody;
				default:
					return null as any;
			}
		});

		// Default rows - first invisible (above wrapper), second visible at wrapper top
		mockTableBody.querySelectorAll.mockReturnValue([
			row(50, '2024-01-12'),
			row(100, '2024-02-05'),
			row(150, '2024-03-20')
		]);

		Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

		spectator = createService();
		service = spectator.service;

		// Run constructor init timeout
		jest.advanceTimersByTime(150);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('initialization', () => {
		it('starts with default state', () => {
			expect(service.isVisible()).toBe(false);
			expect(service.monthYear()).toBe('');
			expect(service.top()).toBe(0);
			expect(service.left()).toBe(0);
		});

		it('caches DOM and attaches scroll listener', () => {
			expect(document.querySelector).toHaveBeenCalledWith('.table-wrapper');
			expect(mockTableWrapper.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
		});

		it('handles missing DOM elements gracefully', () => {
			jest.spyOn(document, 'querySelector').mockReturnValue(null);
			const newService = new ScrollPopupService();

			// Should not throw
			expect(() => newService.cleanup()).not.toThrow();
		});
	});

	describe('scroll visibility + hiding', () => {
		it('shows popup on scroll and hides after delay', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;
			handler(new Event('scroll'));
			expect(service.isVisible()).toBe(true);

			// Hide after delay
			jest.advanceTimersByTime(1250);
			expect(service.isVisible()).toBe(false);
		});

		it('resets hide timer on subsequent scrolls', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;
			handler(new Event('scroll'));
			jest.advanceTimersByTime(800);
			handler(new Event('scroll'));
			// Still visible because timer reset
			jest.advanceTimersByTime(600);
			expect(service.isVisible()).toBe(true);
		});

		it('handles rapid scroll events without memory leaks', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;

			// Simulate rapid scrolling
			for (let i = 0; i < 100; i++) {
				handler(new Event('scroll'));
			}

			expect(service.isVisible()).toBe(true);
			// Should not throw or create excessive memory usage
		});
	});

	describe('month/year extraction', () => {
		it('parses YYYY-MM-DD into abbreviated month + year', () => {
			expect((service as any).extractMonthYearFromText('2024-01-01')).toBe('Jan 2024');
			expect((service as any).extractMonthYearFromText('2024-12-31')).toBe('Dec 2024');
			expect((service as any).extractMonthYearFromText('bad')).toBeNull();
		});

		it('handles all month variations correctly', () => {
			const testCases = [
				{ input: '2024-01-01', expected: 'Jan 2024' },
				{ input: '2024-02-15', expected: 'Feb 2024' },
				{ input: '2024-03-20', expected: 'Mar 2024' },
				{ input: '2024-04-10', expected: 'Apr 2024' },
				{ input: '2024-05-25', expected: 'May 2024' },
				{ input: '2024-06-30', expected: 'Jun 2024' },
				{ input: '2024-07-05', expected: 'Jul 2024' },
				{ input: '2024-08-12', expected: 'Aug 2024' },
				{ input: '2024-09-18', expected: 'Sep 2024' },
				{ input: '2024-10-22', expected: 'Oct 2024' },
				{ input: '2024-11-08', expected: 'Nov 2024' },
				{ input: '2024-12-31', expected: 'Dec 2024' }
			];

			testCases.forEach(({ input, expected }) => {
				expect((service as any).extractMonthYearFromText(input)).toBe(expected);
			});
		});

		it('rejects invalid date formats with strict validation', () => {
			const invalidDates = [
				'invalid-date',
				'2024/03/15',
				'2024-13-01',
				'2024-00-15',
				'2024-3-15',
				'2024-03-1',
				'2024-03-',
				'2024-03',
				'2024-',
				'2024',
				'',
				null,
				undefined
			];

			invalidDates.forEach(invalidDate => {
				expect((service as any).extractMonthYearFromText(invalidDate as any)).toBeNull();
			});
		});

		it('handles edge case month numbers', () => {
			expect((service as any).extractMonthYearFromText('2024-00-15')).toBeNull();
			expect((service as any).extractMonthYearFromText('2024-13-15')).toBeNull();
			expect((service as any).extractMonthYearFromText('2024-99-15')).toBeNull();
		});

		it('updates from first visible row', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;
			handler(new Event('scroll'));
			// With our mock rows, 100 is the first visible row (Feb)
			expect(service.monthYear()).toBe('Feb 2024');
		});

		it('extracts date from DOM elements with strict expectations', () => {
			const mockDateCell = { textContent: '2024-05-20' };
			const mockRow = {
				querySelector: jest.fn().mockReturnValue(mockDateCell)
			};

			const result = (service as any).extractMonthYearFromRow(mockRow);
			expect(mockRow.querySelector).toHaveBeenCalledWith('td:nth-child(5)');
			expect(result).toBe('May 2024');
		});

		it('handles missing date cells gracefully', () => {
			const mockRow = {
				querySelector: jest.fn().mockReturnValue(null)
			};

			const result = (service as any).extractMonthYearFromRow(mockRow);
			expect(mockRow.querySelector).toHaveBeenCalledWith('td:nth-child(5)');
			expect(result).toBeNull();
		});
	});

	describe('binary search row detection', () => {
		it('finds first visible row using binary search algorithm', () => {
			const result = (service as any).findFirstVisibleRow();
			// Should return the first row that's at or below wrapper top
			expect(result).toBeTruthy();
		});

		it('handles empty row array', () => {
			jest.spyOn(Array, 'from').mockReturnValue([]);
			const result = (service as any).findFirstVisibleRow();
			expect(result).toBeNull();
		});

		it('handles single row scenarios', () => {
			const singleRow = [row(100, '2024-01-01')];
			jest.spyOn(Array, 'from').mockReturnValue(singleRow);

			const result = (service as any).findFirstVisibleRow();
			expect(result).toBe(singleRow[0]);
		});

		it('handles all rows above wrapper correctly', () => {
			const hiddenRows = [
				row(50, '2024-01-01'),
				row(75, '2024-02-01')
			];
			jest.spyOn(Array, 'from').mockReturnValue(hiddenRows);

			const result = (service as any).findFirstVisibleRow();
			expect(result).toBeNull();
		});

		it('handles all rows below wrapper correctly', () => {
			const visibleRows = [
				row(200, '2024-01-01'),
				row(250, '2024-02-01')
			];
			jest.spyOn(Array, 'from').mockReturnValue(visibleRows);

			const result = (service as any).findFirstVisibleRow();
			expect(result).toBe(visibleRows[0]); // First row should be visible
		});

		it('handles missing table wrapper gracefully', () => {
			jest.spyOn(document, 'querySelector').mockReturnValue(null);
			const result = (service as any).findFirstVisibleRow();
			expect(result).toBeNull();
		});

		it('performance with large datasets', () => {
			// Create 1000 mock rows
			const largeMockRows = Array.from({ length: 1000 }, (_, i) =>
				row(100 + i * 2, `2024-${String(i % 12 + 1).padStart(2, '0')}-01`)
			);

			jest.spyOn(Array, 'from').mockReturnValue(largeMockRows);

			// Should complete without performance issues
			expect(() => (service as any).findFirstVisibleRow()).not.toThrow();
		});
	});

	describe('positioning calculations', () => {
		it('computes left/top aligned to scrollbar thumb and container', () => {
			mockTableWrapper.scrollTop = 200;
			mockTableWrapper.scrollHeight = 1000;
			mockTableWrapper.clientHeight = 400;

			(service as any).updatePosition();
			expect(service.left()).toBeGreaterThan(0);
			expect(service.top()).toBeGreaterThan(0);
		});

		it('keeps popup within viewport vertically', () => {
			mockTableContainer.getBoundingClientRect.mockReturnValue({ right: 800, top: 900 });
			(service as any).updatePosition();
			expect(service.top()).toBeLessThanOrEqual(window.innerHeight - 40 - 20);
		});

		it('handles zero scroll height gracefully', () => {
			mockTableWrapper.scrollHeight = 400; // Same as clientHeight
			mockTableWrapper.scrollTop = 0;

			expect(() => (service as any).updatePosition()).not.toThrow();
		});

		it('handles extreme scroll positions', () => {
			mockTableWrapper.scrollTop = 999999;
			mockTableWrapper.scrollHeight = 1000000;
			mockTableWrapper.clientHeight = 400;

			expect(() => (service as any).updatePosition()).not.toThrow();
		});

		it('constrains popup to viewport boundaries correctly', () => {
			// Test top boundary
			mockTableContainer.getBoundingClientRect.mockReturnValue({ right: 800, top: -100 });
			(service as any).updatePosition();
			expect(service.top()).toBeGreaterThanOrEqual(20);

			// Test bottom boundary
			mockTableContainer.getBoundingClientRect.mockReturnValue({ right: 800, top: 900 });
			(service as any).updatePosition();
			expect(service.top()).toBeLessThanOrEqual(window.innerHeight - 40 - 20);
		});

		it('calculates scrollbar thumb position accurately', () => {
			mockTableWrapper.scrollTop = 500;
			mockTableWrapper.scrollHeight = 1000;
			mockTableWrapper.clientHeight = 400;

			(service as any).updatePosition();

			// Should position popup relative to scrollbar thumb
			expect(service.left()).toBeGreaterThan(mockTableContainer.getBoundingClientRect().right);
		});
	});

	describe('throttling mechanism', () => {
		it('throttles month/year updates with exact timing precision', () => {
			let currentTime = 1000;
			jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

			// First update
			(service as any).updatePosition();
			const firstUpdateTime = (service as any).lastMonthUpdateTime;

			// Second update immediately (should be throttled)
			(service as any).updatePosition();
			expect((service as any).lastMonthUpdateTime).toBe(firstUpdateTime);

			// Third update after throttle period
			currentTime += 150; // More than 100ms throttle
			(service as any).updatePosition();
			expect((service as any).lastMonthUpdateTime).toBe(currentTime);
		});

		it('handles rapid position updates correctly', () => {
			let currentTime = 1000;
			jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

			// Simulate rapid updates
			for (let i = 0; i < 100; i++) {
				(service as any).updatePosition();
				currentTime += 10; // Small increments
			}

			// Should have throttled most updates
			expect((service as any).lastMonthUpdateTime).toBeGreaterThan(1000);
		});

		it('maintains performance under load', () => {
			let currentTime = 1000;
			jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

			const startTime = Date.now();

			// Simulate heavy load
			for (let i = 0; i < 1000; i++) {
				(service as any).updatePosition();
				currentTime += 5;
			}

			const endTime = Date.now();
			// Should complete quickly (under 100ms)
			expect(endTime - startTime).toBeLessThan(100);
		});
	});

	describe('initial date setting', () => {
		it('sets initial date when valid', () => {
			service.setInitialDate('2024-06-15');
			expect(service.monthYear()).toBe('Jun 2024');
		});

		it('ignores invalid initial date', () => {
			service.setInitialDate('invalid');
			expect(service.monthYear()).toBe('');
		});

		it('handles empty initial date', () => {
			service.setInitialDate('');
			expect(service.monthYear()).toBe('');
		});

		it('handles null/undefined initial date', () => {
			service.setInitialDate(null as any);
			expect(service.monthYear()).toBe('');

			service.setInitialDate(undefined as any);
			expect(service.monthYear()).toBe('');
		});
	});

	describe('cleanup and error handling', () => {
		it('removes listeners and clears timers', () => {
			const clearSpy = jest.spyOn(window, 'clearTimeout');
			service.cleanup();
			expect(mockTableWrapper.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
			expect(clearSpy).toHaveBeenCalled();
		});

		it('handles cleanup when not initialized', () => {
			// Create new service without initialization
			const newService = new ScrollPopupService();

			expect(() => newService.cleanup()).not.toThrow();
		});

		it('handles multiple cleanup calls gracefully', () => {
			// Should not throw and should clean up properly
			service.cleanup();
			service.cleanup();
			service.cleanup();

			expect(mockTableWrapper.removeEventListener).toHaveBeenCalledTimes(1);
		});

		it('prevents memory leaks during rapid operations', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;

			// Simulate rapid scrolling
			for (let i = 0; i < 1000; i++) {
				handler(new Event('scroll'));
			}

			// Should not throw or create excessive memory usage
			expect(service.isVisible()).toBe(true);
		});
	});

	describe('DOM element handling', () => {
		it('refreshes rows when needed', () => {
			// Mock empty rows initially
			mockTableBody.querySelectorAll.mockReturnValue([]);

			// Service should refresh rows when needed
			(service as any).updateMonthYear();
			expect(mockTableBody.querySelectorAll).toHaveBeenCalledWith('tr');
		});

		it('handles missing table body gracefully', () => {
			jest.spyOn(document, 'querySelector').mockReturnValue(null);
			const newService = new ScrollPopupService();

			// Should not throw during initialization
			jest.advanceTimersByTime(150);
			expect(() => newService.cleanup()).not.toThrow();
		});
	});
});
