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

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Closes in less than an hour';
    if (hours < 24) return `Closes in ${hours} hour${hours !== 1 ? 's' : ''}`;

    const days = Math.ceil(hours / 24);
    if (days === 1) return 'Closes tomorrow';
    return `Closes in ${days} days`;
  }
}
