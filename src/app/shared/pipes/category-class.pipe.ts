import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'categoryClass' })
export class CategoryClassPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    switch (value.toLowerCase()) {
      case 'reel':
        return 'capsule capsule--reel';
      case 'reel + stories':
        return 'capsule capsule--reel-stories';
      case 'photoshoot':
        return 'capsule capsule--photoshoot';
      case 'social media post':
        return 'capsule capsule--social';
      case 'food review':
        return 'capsule capsule--food-review';
      case 'blog post':
        return 'capsule capsule--blog';
      default:
        return 'capsule capsule--other';
    }
  }
}
