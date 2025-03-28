import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { HomeComponent } from './home/home.component';
import { LoadingSpinnerChartComponent } from './loading-spinner-chart/loading-spinner-chart.component';

export const routes: Routes = [
    {path: 'login', component: LoginComponent},
    {path: 'signup', component: SignupComponent},
    {path: 'home', component: HomeComponent},
    {path: 'spinner1', component: LoadingSpinnerChartComponent},
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {path: '**', redirectTo: 'login'}
];
