import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole = route.data['role'];

  if (auth.userRole() === requiredRole || auth.userRole() === 'admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
