import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { AgreementListColumn } from './lists/agreement-list-column';
import { AgreementListFilterModel } from './lists/agreement-list-filter-model';
import { Observable } from 'rxjs';
import { AgreementListItem } from './lists/agreement-list-item';
import { convertDateOffsetToUtc } from '../shared/tools/convert-date-offset-to-utc';
import { AgreementListUpdatedColumnsModel } from './lists/agreement-list-updated-columns';
import { Agreement } from './models/agreement';
import { AgreementRelation } from './models/agreement-relation';
import { convertDateUtcToLocal } from '../shared/tools/convert-date-utc-to-local';
import { cloneDeep } from 'lodash';
import * as moment from 'moment';
import { BaseService } from '../shared/services/base.service';
import { AgreementFilter } from './models/agreement-filter';
import { AgreementWithCount } from './models/agreement-with-count';
import { AgreementPermission } from './models/agreement-permission';
import { ReportFile } from '../shared/models/report-file';

@Injectable({
  providedIn: 'root'
})
export class AgreementService {
  apiUrl = 'api/agreements';

  /** Формат даты */
  DATE_FROMAT = 'DD.MM.YYYY';

  constructor(
    private http: HttpClient,
    private baseService: BaseService
  ) { }

  getAgreementListColumns() {
    const requestUrl = `${this.apiUrl}/list/columns`;
    return this.http.get<AgreementListColumn[]>(requestUrl).pipe(
      map(items => {
        const instances: AgreementListColumn[]  = [];
  
          items.forEach(item => {
            instances.push(Object.assign(new AgreementListColumn(), item));
          });

          return instances;
      })
    );
  }

  // *** УДАЛИЛ ПОХОЖИЙ КОД ***
  resetAgreementListColumnsSettings() {
    const requestUrl = `${this.apiUrl}/list/columns/reset`;
    return this.http.post(requestUrl, undefined);
  }

  private getFilters(agrFilters: AgreementListFilterModel): AgreementListFilterModel {
    const filters = { ...agrFilters };

    if (filters.date && filters.date.getUTCHours() !== 0) {
      filters.date = convertDateOffsetToUtc(filters.date);
    }

    // Очистим даты, если они меньше допустимых значений в MSSQL
    const minYear = 1753; // SqlDateTime.MinValue
    if (filters.date && filters.date.getUTCFullYear() < minYear) {
      filters.date = null;
    }

    if (filters.idInternal && isNaN(Number(filters.idInternal))) {
      const ID = 'ID=';
      const index = filters.idInternal.lastIndexOf(ID);
      if (index !== -1 && (index + ID.length) < filters.idInternal.length) {
        filters.idInternal = filters.idInternal.substr(index + ID.length);
      } else {
        filters.idInternal = null;
      }
    }

    return filters;
  }

  getAgreementListByFilters(tranFilters: AgreementListFilterModel, idLanguage: number, skip: number, size: number): Observable<{ items: AgreementListItem[], rowsCount: number }> {
    const requestUrl = `${this.apiUrl}/list/${idLanguage}/${skip}/${size}`;
    const filters = this.getFilters(tranFilters);

    return this.http.post<{ items: AgreementListItem[], rowsCount: number }>(requestUrl, filters).pipe(
      map(items => {
        if (items.items && items.items.length > 0) {
          items.items.forEach(item => {
            // item.createdAt = item.createdAt ? new Date(item.createdAt) : undefined;
            // item.paymentDate = item.paymentDate ? new Date(item.paymentDate) : undefined;
            // item.accountDate = item.accountDate ? new Date(item.accountDate) : undefined;
                
            // item.paymentPeriodFrom = item.paymentPeriodFrom ? new Date(item.paymentPeriodFrom) : undefined;
            // item.paymentPeriodTo = item.paymentPeriodTo ? new Date(item.paymentPeriodTo) : undefined;
  
            // item.endDateFact = item.endDateFact ? new Date(item.endDateFact) : undefined;
          });
        }

            return items;
      })
    );
  }

  exportAgreementList(tranFilters: AgreementListFilterModel, idLanguage: number): Observable<ReportFile> {
    const requestUrl = `${this.apiUrl}/list-export/${idLanguage}`;
    const filters = this.getFilters(tranFilters);
    return this.http.post<ReportFile>(requestUrl, filters);
  }

  getAgreementByFilter(filter: AgreementFilter): Observable<AgreementWithCount> {
    return this.http.post<AgreementWithCount>(`${this.apiUrl}/byFilter`, filter);
  }

  // *** УДАЛИЛ ПОХОЖИЙ КОД ***

  getAgreement(idAgreement: number): Observable<Agreement> {
    const requestUrl = `${this.apiUrl}/${idAgreement}`;
    return this.http.get<Agreement>(requestUrl).pipe(
      map(agreement => {
        agreement.paymentSchedules.forEach(schedule => {
          schedule.paymentDate = convertDateUtcToLocal(schedule.paymentDate, this.DATE_FROMAT);
        });
        agreement.paymentHistories.forEach(history => {
          history.requestDate = convertDateUtcToLocal(history.requestDate, this.DATE_FROMAT);
          history.paymentDatePlan = convertDateUtcToLocal(history.paymentDatePlan, this.DATE_FROMAT);
          history.paymentDateFact = convertDateUtcToLocal(history.paymentDateFact, this.DATE_FROMAT);

          history.requestNumberLink = `<a href="/payment/view/${history.idPaymentRequest}" target="_blank">${history.idPaymentRequest}</a>`;
          if (history.comments && history.comments.length > 0) { history.commentsButtonHtml = `<button class="comments-btn">Комментарии</button>`; }
        });

        if (agreement.basisOnTCDate) { agreement.basisOnTCDate = moment.utc(agreement.basisOnTCDate).toDate(); }
        if (agreement.basisOnTCStartDate) { agreement.basisOnTCStartDate = moment.utc(agreement.basisOnTCStartDate).toDate(); }

        return agreement;
      })
    );
  }

  updateAgreement(agreement: Agreement): Observable<number> {
    const agreementToSave = cloneDeep(agreement);
    if (agreementToSave.paymentSchedules && agreementToSave.paymentSchedules.length > 0) {
      agreementToSave.paymentSchedules.forEach(x => x.paymentDate = <any>moment.utc(x.paymentDate, this.DATE_FROMAT));
    }
    // История оплат не сохраняется не имеет смысла отправлять ее на бэк
    agreementToSave.paymentHistories = null;
    const requestUrl = `${this.apiUrl}`;
    return this.http.put<number>(requestUrl, agreementToSave);
  }

  // *** УДАЛИЛ ПОХОЖИЙ КОД ***
}
