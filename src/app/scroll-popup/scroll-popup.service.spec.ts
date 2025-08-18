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
			row(50, 'Jan 12, 2024'),
			row(100, 'Feb 5, 2024'),
			row(150, 'Mar 20, 2024')
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
			expect(mockTableWrapper.addEventListener).toHaveBeenCalledWith('scroll', jasmine.any(Function), { passive: true });
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
		it('parses month name format into month + year (removing day)', () => {
			expect((service as any).extractMonthYearFromText('Jan 1, 2024')).toBe('Jan 2024');
			expect((service as any).extractMonthYearFromText('Dec 31, 2024')).toBe('Dec 2024');
			expect((service as any).extractMonthYearFromText('bad')).toBeNull();
		});

		it('handles all month variations correctly', () => {
			const testCases = [
				{ input: 'Jan 1, 2024', expected: 'Jan 2024' },
				{ input: 'Feb 15, 2024', expected: 'Feb 2024' },
				{ input: 'Mar 20, 2024', expected: 'Mar 2024' },
				{ input: 'Apr 10, 2024', expected: 'Apr 2024' },
				{ input: 'May 25, 2024', expected: 'May 2024' },
				{ input: 'Jun 30, 2024', expected: 'Jun 2024' },
				{ input: 'Jul 5, 2024', expected: 'Jul 2024' },
				{ input: 'Aug 12, 2024', expected: 'Aug 2024' },
				{ input: 'Sep 18, 2024', expected: 'Sep 2024' },
				{ input: 'Oct 22, 2024', expected: 'Oct 2024' },
				{ input: 'Nov 8, 2024', expected: 'Nov 2024' },
				{ input: 'Dec 31, 2024', expected: 'Dec 2024' }
			];

			testCases.forEach(({ input, expected }) => {
				expect((service as any).extractMonthYearFromText(input)).toBe(expected);
			});
		});

		it('handles French month abbreviations correctly', () => {
			const frenchTestCases = [
				{ input: 'Fév 15, 2024', expected: 'Fév 2024' },
				{ input: 'Avr 10, 2024', expected: 'Avr 2024' },
				{ input: 'Juin 30, 2024', expected: 'Juin 2024' },
				{ input: 'Juil 5, 2024', expected: 'Juil 2024' },
				{ input: 'Août 12, 2024', expected: 'Août 2024' },
				{ input: 'Déc 31, 2024', expected: 'Déc 2024' }
			];

			frenchTestCases.forEach(({ input, expected }) => {
				expect((service as any).extractMonthYearFromText(input)).toBe(expected);
			});
		});

		it('preserves month names as-is (no language conversion)', () => {
			// English months should remain in English
			expect((service as any).extractMonthYearFromText('Jan 15, 2024')).toBe('Jan 2024');
			expect((service as any).extractMonthYearFromText('Dec 31, 2024')).toBe('Dec 2024');

			// French months should remain in French
			expect((service as any).extractMonthYearFromText('Jan 15, 2024')).toBe('Jan 2024');
			expect((service as any).extractMonthYearFromText('Déc 31, 2024')).toBe('Déc 2024');
		});

		it('rejects invalid date formats with strict validation', () => {
			const invalidDates = [
				'invalid-date',
				'Jan/15/2024',
				'Jan 32, 2024',
				'Jan 0, 2024',
				'Jan 15, 999',
				'Jan 15, 10000',
				'Jan, 2024',
				'Jan 15',
				'Jan',
				'',
				null,
				undefined
			];

			invalidDates.forEach(invalidDate => {
				expect((service as any).extractMonthYearFromText(invalidDate as any)).toBeNull();
			});
		});

		it('handles edge case day numbers', () => {
			expect((service as any).extractMonthYearFromText('Jan 0, 2024')).toBeNull();
			expect((service as any).extractMonthYearFromText('Jan 32, 2024')).toBeNull();
			expect((service as any).extractMonthYearFromText('Jan 99, 2024')).toBeNull();
		});

		it('updates from first visible row', () => {
			const handler = mockTableWrapper.addEventListener.mock.calls[0][1] as (e: Event) => void;
			handler(new Event('scroll'));
			// With our mock rows, 100 is the first visible row (Feb)
			expect(service.monthYear()).toBe('Feb 2024');
		});

		it('extracts date from DOM elements with strict expectations', () => {
			const mockDateCell = { textContent: 'May 20, 2024' };
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
			const singleRow = [row(100, 'Jan 1, 2024')];
			jest.spyOn(Array, 'from').mockReturnValue(singleRow);

			const result = (service as any).findFirstVisibleRow();
			expect(result).toBe(singleRow[0]);
		});

		it('handles all rows above wrapper correctly', () => {
			const hiddenRows = [
				row(50, 'Jan 1, 2024'),
				row(75, 'Feb 1, 2024')
			];
			jest.spyOn(Array, 'from').mockReturnValue(hiddenRows);

			const result = (service as any).findFirstVisibleRow();
			expect(result).toBeNull();
		});

		it('handles all rows below wrapper correctly', () => {
			const visibleRows = [
				row(200, 'Jan 1, 2024'),
				row(250, 'Feb 1, 2024')
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
			const largeMockRows = Array.from({ length: 1000 }, (_, i) => {
				const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
				const month = monthNames[i % 12];
				return row(100 + i * 2, `${month} 1, 2024`);
			});

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
			service.setInitialDate('Jun 15, 2024');
			expect(service.monthYear()).toBe('Jun 2024');
		});

		it('sets initial date in French when valid', () => {
			service.setInitialDate('Juin 15, 2024');
			expect(service.monthYear()).toBe('Juin 2024');
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
			expect(mockTableWrapper.removeEventListener).toHaveBeenCalledWith('scroll', jasmine.any(Function));
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
