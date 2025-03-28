import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isLoggedIn = false;

  navigateToHome() {
  }
  navigateToOptimization(){}
  navigateToContact(){}
  navigateToLogin(){}
  logout(){}
}
