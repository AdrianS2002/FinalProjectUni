
import { AfterViewInit, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartType } from 'chart.js';
import { Router } from '@angular/router';
import { TransitionService } from '../services/transition.service';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit{

  public userRole: 'MANAGER' | 'USER' | null = null;
  public username: string | null = null;
  public userConsumptionPoint: any = null;

  public userChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#e8fdfd' }
      }
    },
    scales: {
      x: { ticks: { color: '#a7bfc9' }},
      y: { ticks: { color: '#a7bfc9' }}
    }
  };
  constructor(private router:Router, private transitionService: TransitionService, private authService: AuthService, private usersService: UsersService) {
    this.authService.user$.subscribe(user => {
      this.userRole = user?.roles?.[0] || null;
      this.username = user?.username || null;
      if (this.userRole === 'USER' && this.username) {
        this.loadUserConsumptionPoint(this.username);
      }
      console.log('User role:', this.userRole); 
    })
  }
  public lineChartType: ChartType = 'line';

  public lineChartData: any = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        data: [5, 4, 4, 4, 3, 2, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 3, 4, 5, 5, 4],
        label: 'Global Energy Consumption (kWh)',
        fill: true,
        tension: 0.3,
        borderColor: '#00ffc8',
        backgroundColor: 'rgba(0, 255, 200, 0.2)',
        pointBackgroundColor: '#3fe66c',
        pointBorderColor: '#00bcd4'
      }
    ]
  };

  public lineChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#e8fdfd'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#a7bfc9' }
      },
      y: {
        ticks: { color: '#a7bfc9' }
      }
    }
  };

  loadUserConsumptionPoint(username: string): void {
    this.usersService.getConsumptionPointByUsername(username).subscribe({
      next: (point) => {
        this.userConsumptionPoint = point;
       
        
      },
      error: err => console.error('❌ Error fetching user consumption point:', err)
    });
  }
  ngAfterViewInit(): void {
    const elements = document.querySelectorAll('.fade-in, .fade-out');
  
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        } else {
          entry.target.classList.remove('in-view');
        }
      });
    }, {
      threshold: 0.2
    });
  
    elements.forEach(el => observer.observe(el));
  }
  
  navigateWithTransition(path: string): void {
    this.transitionService.animateTransition().then(() => {
      this.router.navigateByUrl(path);
    });
  }

  navigateToLogin(): void {
    this.navigateWithTransition('/login');
  }


  navigateToSignUp(): void {
    this.navigateWithTransition('/signup');
  }

  navigateToOptimization(): void {
    this.navigateWithTransition('/optimization');
  }


  navigateToManageUsers(): void {
    this.navigateWithTransition('/manage-users');
  }

}
