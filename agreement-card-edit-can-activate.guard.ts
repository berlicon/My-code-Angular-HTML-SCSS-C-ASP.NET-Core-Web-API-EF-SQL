import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BaseService } from 'src/app/shared/services/base.service';
import { AppErrorType } from 'src/app/errors/app-error-type';
import { AgreementService } from '../../agreement.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class AgreementCardEditCanActivateGuard implements CanActivate {
  constructor(
    private baseService: BaseService,
    private agreementService: AgreementService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (!route || !route.params || !route.params.id || isNaN(route.params.id) || (+route.params.id) <= 0) {
      this.baseService.goToErrorPage(AppErrorType.AgreementNotFound);
      return of(false);
    }

    return this.agreementService.getAgreementPermission(route.params.id).pipe(
      map(permission => {
        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        if (!permission.canEdit) {
          this.baseService.goToErrorPage(AppErrorType.AgreementEditNoPermissionToEdit);
          return false;
        }

        return true;
    }));
  }
}
