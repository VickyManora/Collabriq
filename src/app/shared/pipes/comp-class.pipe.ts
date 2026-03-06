import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'compClass' })
export class CompClassPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const lower = value.toLowerCase();
    if (lower.includes('barter')) return 'capsule capsule--barter';
    if (lower.includes('free product') || lower.includes('free')) return 'capsule capsule--free-product';
    if (lower.includes('paid') || lower.includes('$') || lower.includes('rs') || lower.includes('inr')) return 'capsule capsule--paid';
    return 'capsule capsule--comp-default';
  }
}
