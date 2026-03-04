import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { Toast } from '../../shared/toast/toast';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Header, Sidebar, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  sidebarOpen = signal(false);

  onMenuToggle() {
    this.sidebarOpen.update((v) => !v);
  }
}
