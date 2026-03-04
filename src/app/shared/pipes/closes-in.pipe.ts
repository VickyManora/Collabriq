import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'closesIn',
})
export class ClosesInPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const now = Date.now();
    const closes = new Date(value).getTime();
    const diff = closes - now;

    if (diff <= 0) return 'Expired';

    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return 'Closes today';
    if (hours < 48) return 'Closes tomorrow';

    const days = Math.ceil(hours / 24);
    return `Closes in ${days} days`;
  }
}
