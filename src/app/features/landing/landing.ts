import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  imports: [RouterLink],
})
export class Landing {
  constructor(protected theme: ThemeService) {}

  mobileMenuOpen = signal(false);
  activePreview = signal<'creator' | 'business'>('creator');

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  readonly opportunities = [
    {
      business: 'The Brew Studio',
      handle: '@brewstudio',
      initial: 'T',
      category: 'Food Review',
      title: 'Looking for food bloggers to review our new menu',
      compensation: '\uD83C\uDF81 Free meal + \u20B92,000 per reel',
      spots: '\uD83D\uDD25 3 spots left',
      applicants: 5,
      location: 'Pune',
    },
    {
      business: 'Urban Threads',
      handle: '@urbanthreads',
      initial: 'U',
      category: 'Reel',
      title: 'Instagram Reel collaboration for summer collection launch',
      compensation: '\uD83C\uDF81 \u20B95,000 per reel',
      spots: '\uD83D\uDD25 2 spots left',
      applicants: 12,
      location: 'Pune',
    },
    {
      business: 'Caf\u00E9 Mosaic',
      handle: '@cafemosaic',
      initial: 'C',
      category: 'Photoshoot',
      title: 'Photoshoot for cafe ambience and signature drinks',
      compensation: '\uD83C\uDF81 Barter \u2014 free meal for two',
      spots: '\uD83D\uDD25 1 spot left',
      applicants: 8,
      location: 'Pune',
    },
  ];
}
