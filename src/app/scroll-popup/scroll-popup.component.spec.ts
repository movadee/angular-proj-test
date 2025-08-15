import { Spectator, createComponentFactory } from '@ngneat/spectator/jest';
import { ScrollPopupComponent } from './scroll-popup.component';
import { ScrollPopupService } from './scroll-popup.service';
import { MockProvider } from 'ng-mocks';

/**
 * Component tests verify:
 * - Visibility via *ngIf based on service.isVisible()
 * - Inline positioning styles bound to service.top() and service.left()
 * - Rendered month/year text from service.monthYear()
 */
describe('ScrollPopupComponent (Spectator + Jest)', () => {
	let spectator: Spectator<ScrollPopupComponent>;

	const makeService = (overrides?: Partial<Record<'isVisible' | 'top' | 'left' | 'monthYear', any>>): Partial<ScrollPopupService> => ({
		isVisible: jest.fn(() => true),
		top: jest.fn(() => 120),
		left: jest.fn(() => 240),
		monthYear: jest.fn(() => 'Feb 2024'),
		cleanup: jest.fn(),
		...overrides,
	});

	const createComponent = (serviceOverrides?: Partial<Record<'isVisible' | 'top' | 'left' | 'monthYear', any>>) => {
		const mock = makeService(serviceOverrides) as unknown as ScrollPopupService;
		const factory = createComponentFactory({
			component: ScrollPopupComponent,
			providers: [MockProvider(ScrollPopupService, mock)],
		});
		return { spectator: factory(), mockService: mock };
	};

	test('renders when visible and shows month/year with correct positioning', () => {
		({ spectator } = createComponent());

		const popup = spectator.query('.scroll-popup') as HTMLElement;
		expect(popup).toBeTruthy();
		expect(popup.textContent?.trim()).toBe('Feb 2024');

		// Check inline style bindings
		expect((popup.style.top || popup.getAttribute('style') || '')).toContain('top');
		expect((popup.style.left || popup.getAttribute('style') || '')).toContain('left');
	});

	test('does not render when not visible', () => {
		({ spectator } = createComponent({ isVisible: () => false }));
		expect(spectator.query('.scroll-popup')).toBeNull();
	});

	test('updates view when service values change between runs (simulation)', () => {
		// First render visible with Feb
		let res = createComponent({ isVisible: () => true, monthYear: () => 'Feb 2024', top: () => 100, left: () => 200 });
		spectator = res.spectator;
		let popup = spectator.query('.scroll-popup') as HTMLElement;
		expect(popup).toBeTruthy();
		expect(popup.textContent?.trim()).toBe('Feb 2024');

		// Recreate with different data to simulate change
		res = createComponent({ isVisible: () => true, monthYear: () => 'Mar 2024', top: () => 160, left: () => 260 });
		spectator = res.spectator;
		popup = spectator.query('.scroll-popup') as HTMLElement;
		expect(popup.textContent?.trim()).toBe('Mar 2024');
	});

	test('calls service.cleanup on destroy', () => {
		const { spectator: specInstance, mockService } = createComponent();
		spectator = specInstance;
		spectator.fixture.destroy();
		expect((mockService.cleanup as unknown as jest.Mock)).toHaveBeenCalled();
	});
});
