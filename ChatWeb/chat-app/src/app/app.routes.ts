import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
    {path:'', redirectTo:'auth', pathMatch:'full'},
    {path:'auth', component: AuthComponent},
    {path:'', component: LayoutComponent, children:[
        {path:'dashboard', component: DashboardComponent}
    ]}
];
