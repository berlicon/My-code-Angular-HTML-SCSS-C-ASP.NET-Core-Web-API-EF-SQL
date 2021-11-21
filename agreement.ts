import { AgreementPaymentSchedule } from './agreement-payment-schedule';
import { AgreementPaymentHistory } from './agreement-payment-history';

export interface Agreement {
  idAgreement: number;

  idContractorAgreement: number;

  name: string;

  date: Date;

  endDate: Date;

  amount: number;

  regionName: string;

  // *** УДАЛИЛ ПОХОЖИЙ КОД ***

  /** Флаг - есть несохраненные данные  */
  hasUnsavedChanges: boolean;
}
