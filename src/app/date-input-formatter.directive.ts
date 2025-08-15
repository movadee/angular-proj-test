// import { Directive, ElementRef, HostListener, inject } from '@angular/core';
// import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { Directive, ElementRef, HostListener, inject, Input } from '@angular/core';


// @Directive({
//   selector: '[appDateInputFormatter]',
//   standalone: true,
// })
// export class DateInputFormatterDirective {
//   private host = inject(ElementRef<HTMLInputElement>);

//   @HostListener('input')
//   onInput(): void {
//     const native = this.host.nativeElement;

//     requestAnimationFrame(() => {
//       const input: HTMLInputElement | null =
//         native instanceof HTMLInputElement
//           ? native
//           : native.querySelector('input');

//       if (!input || typeof input.value !== 'string') return;

//       const rawValue = input.value;
//       const selectionStart = input.selectionStart ?? rawValue.length;
//       const selectionEnd = input.selectionEnd ?? rawValue.length;

//       const allDigits = rawValue.replace(/\D/g, '');
//       const digitsBefore = rawValue.slice(0, selectionStart).replace(/\D/g, '');
//       const digitsAfter = rawValue.slice(selectionEnd).replace(/\D/g, '');

//       const typedDigitCount =
//         allDigits.length - digitsBefore.length - digitsAfter.length;
//       const insertedDigits = allDigits.slice(
//         digitsBefore.length,
//         digitsBefore.length + typedDigitCount
//       );

//       const newDigits = (digitsBefore + insertedDigits + digitsAfter).slice(
//         0,
//         8
//       );

//       let formatted = '';
//       if (newDigits.length >= 5) {
//         formatted = `${newDigits.slice(0, 2)}/${newDigits.slice(
//           2,
//           4
//         )}/${newDigits.slice(4)}`;
//       } else if (newDigits.length >= 3) {
//         formatted = `${newDigits.slice(0, 2)}/${newDigits.slice(2)}`;
//       } else {
//         formatted = newDigits;
//       }

//       input.value = formatted;

//       let newCursor = digitsBefore.length;
//       if (newCursor > 2) newCursor += 1;
//       if (newCursor > 4) newCursor += 1;

//       requestAnimationFrame(() => {
//         input.setSelectionRange(newCursor, newCursor);
//       });
//     });
//   }
// }
@Directive({
  selector: '[appDateInputFormatter]',
  standalone: true,
})
export class DateInputFormatterDirective {
  private elementRef = inject(ElementRef<HTMLInputElement>);
  @Input() locale: 'en' | 'fr' = 'en';

  private prevValue = '';
  private prevSelectionStart: number | null = null;
  private inserted = '';

  private get input(): HTMLInputElement | null {
    const el = this.elementRef.nativeElement;
    return el instanceof HTMLInputElement ? el : el.querySelector('input');
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.input) return;
    this.prevValue = this.input.value;
    this.prevSelectionStart = this.input.selectionStart;
    this.inserted = event.key.length === 1 ? event.key : '';
  }

  @HostListener('input')
  onInput(): void {
    if (!this.input || this.prevSelectionStart === null) return;

    requestAnimationFrame(() => {
      const current = this.input!.value;

      // Manually construct new string based on selection and inserted value
      const before = this.prevValue.slice(0, this.prevSelectionStart!);
      const after = this.prevValue.slice(this.input!.selectionEnd ?? 0);
      const rawDigits = (before + this.inserted + after)
        .replace(/\D/g, '')
        .slice(0, 8);

      let p1 = rawDigits.slice(0, 2);
      let p2 = rawDigits.slice(2, 4);
      let p3 = rawDigits.slice(4, 8);
      let formatted = '';

      if (p3) {
        formatted = `${p1}/${p2}/${p3}`;
      } else if (p2) {
        formatted = `${p1}/${p2}`;
      } else {
        formatted = p1;
      }

      // Validate full date
      if (rawDigits.length === 8) {
        const [day, month] =
          this.locale === 'fr'
            ? [parseInt(p1), parseInt(p2)]
            : [parseInt(p2), parseInt(p1)];
        const year = parseInt(p3);
        const d = new Date(year, month - 1, day);
        const valid =
          d.getFullYear() === year &&
          d.getMonth() === month - 1 &&
          d.getDate() === day;
        if (!valid) return;
      }

      this.input!.value = formatted;
      const pos = formatted.length;
      this.input!.setSelectionRange(pos, pos);
    });
  }
}
