import { Component, Injector, OnInit, Injectable, Output, EventEmitter, ViewChild, HostListener } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpProgressEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { GridDataResult, RowClassArgs, PageChangeEvent, DataStateChangeEvent, GridComponent } from '@progress/kendo-angular-grid';
import { FilterService } from '@progress/kendo-angular-grid';
import { AutoCompleteComponent, MultiSelectComponent } from '@progress/kendo-angular-dropdowns';
import { GridDataResultEx } from '../../models/grid-data-result-ex';
import { DataSourceRequestState, DataResult, filterBy, FilterDescriptor, CompositeFilterDescriptor, toDataSourceRequest } from '@progress/kendo-data-query';
import { DialogService, DialogRef, DialogCloseResult, DialogAction } from '@progress/kendo-angular-dialog';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { State, process } from '@progress/kendo-data-query';															
import { of } from 'rxjs/observable/of';
import { concat } from 'rxjs/observable/concat';
import { delay } from 'rxjs/operators/delay';
import { forEach } from 'lodash';
import * as moment from 'moment';
import { BaseComponent } from '../base.component';
import { SalaryData } from '../../models/salary-data';
import { ListItem } from '../../models/list-item';
import { RowError } from '../../models/row-error';
import { PositionEx } from '../../models/positionEx';
import { Position } from '../../models/position';
import { PositionService } from '../../services/position.service';
import { BonusFrequencyService } from '../../services/bonus-frequency.service';
import { RegionalAllowanceService } from '../../services/regional-allowance.service';
import { MinimumWageService } from '../../services/minimum-wage.service';
import { RegionalAllowance } from '../../models/regional-allowance';
import { MinimumWage } from '../../models/minimum-wage';
import { PayWellSector } from '../../models/pay-well-sector';
import { Error } from '../../models/error';
import { CompanyService } from '../../services/company.service';
import { PayWellSectorService } from '../../services/pay-well-sector.service';
import { LocationService } from '../../services/location.service';
import { QuestionarySalaryService } from '../../services/questionary-salary.service';
import { QuestionaryStatusService } from '../../services/questionary-status.service';
import { UserService } from '../../services/user.service';
import { Company } from '../../models/company';
import { QuestionaryStatus } from '../../models/questionary-status';
import { LocationModel } from '../../models/location-model';
import { User } from '../../models/user';
import { QuestionarySalary } from '../../models/questionary-salary';
import { QuestionaryStatusEnum } from '../../enums/questionary-status-enum';
import { ErrorTypeEnum } from '../../enums/error-type-enum';
import { SalaryGridColumnEnum } from '../../enums/salary-grid-column-enum';
import { DownloadRawDataFilterTypeEnum } from '../../enums/download-raw-data-filter-type-enum';
import { DownloadRawDataRequest } from '../../models/download-raw-data-request';
import { QuestionarySalaryRequest } from '../../models/questionary-salary-request';

const itemIndex = (item: any, data: any[]): number => {
  for (let idx = 0; idx < data.length; idx++) {
    if (data[idx].id === item.id) {
      return idx;
    }
  }
  return -1;
};

const flatten = filter => {
  const filters = (filter || {}).filters;
  if (filters) {
    return filters.reduce((acc, curr) => acc.concat(curr.filters ? flatten(curr) : [curr]), []);
  }
  return [];
};

@Component({
  selector: 'app-questionary-salary',
  templateUrl: './questionary-salary.component.html',
  styles: [`
       .whole-cell {
         display: block;
         padding: 0;
       }
      .k-panelbar .k-item {
        background-color: #E4E4E4;
      }
   `],
  styleUrls: ['./questionary-salary.component.scss']
})

export class QuestionarySalaryComponent extends BaseComponent implements OnInit {
  public ErrorTypeEnum = ErrorTypeEnum;
  public SalaryGridColumnEnum = SalaryGridColumnEnum;
  public DownloadRawDataFilterTypeEnum = DownloadRawDataFilterTypeEnum;
  public QuestionaryStatusEnum = QuestionaryStatusEnum;
  @Output() fullScreenChange: EventEmitter<boolean> = new EventEmitter();
  @ViewChild('txtCompanyFilter') txtCompanyFilter: AutoCompleteComponent;
  @ViewChild('grid') grid: GridComponent;

  public years: Array<number> = [];
  public year: number = 0;
  public payWellSectors: Array<PayWellSector> = [];
  public payWellSector: Array<PayWellSector> = [];
  public payWellSectorUpload: Array<PayWellSector> = [];
  public districts: Array<LocationModel> = [];
  public district: Array<LocationModel> = [];
  public districtPrev: Array<LocationModel> = [];
  public districtUpload: Array<LocationModel> = [];
  public regions: Array<LocationModel> = [];
  public region: Array<LocationModel> = [];
  public regionPrev: Array<LocationModel> = [];
  public regionUpload: Array<LocationModel> = [];
  public cities: Array<LocationModel> = [];
  public city: Array<LocationModel> = [];
  public cityUpload: Array<LocationModel> = [];
  public currentCompanyName: string = "";
  public currentPayWellSectorName: string = "";
  public responsibles: Array<User> = [];
  public localeId: string;
  public formGroup: FormGroup;
  public companies: Array<Company> = [];
  public companyFilter: string = "";
  public companiesFilter: Array<Company> = [];
  public currentQuestionary: QuestionarySalary;
  public positions: Array<Position> = [];
  public positionsFilterMultiSelect: Array<Position> = [];
  public positionsFilterMultiSelectCurrent: Array<Position> = [];
  public bonusFrequencies: Array<ListItem> = [];
  public questionaryStatuses: Array<ListItem> = [];
  public questionaryStatusesWithoutAll: Array<ListItem> = [];
  public questionaryStatus: Array<ListItem> = [];
  public regionalAllowances: Array<RegionalAllowance> = [];
  public minimumWages: Array<MinimumWage> = [];
  public pwcPositionSelection: number[] = [];
  private positionsFilter: any[] = [];
  public gridView: GridDataResultEx = new GridDataResultEx({ data: [], total: 0, errors: { warnings: [], errors: [] } });
  public gridPositionView: DataResult;
  public gridPositionData: Array<PositionEx> = [];
  public gridPositionsFilter: Array<PositionEx> = [];
  public currentErrorTypeId: number;
  public currentErrorType: RowError;
  private currentCompanyId: number = 0;
  private currentCompanyPayWellSectorId: number = 0;
  private currentQuestionarySalaryId: number = 0;
  public allExceptMsk: boolean = false;
  private mskCityId: number;
  public showSelectedError: boolean = false;
  public errorsStatusCollapsed: boolean = false;
  public errorsCollapsed: boolean = true;
  public warningsCollapsed: boolean = true;
  public fullScreen: boolean = false;
  public now: Date = moment().endOf('day').toDate();
  public loading: boolean;
  public innerHeight: number;
  public surveyEndDate: Date;
  public filterPanelEditMode: boolean = false;
  public questionaryFilterPanelEditMode: boolean = false;
  private request: QuestionarySalaryRequest = new QuestionarySalaryRequest();

  public get errorsHeight(): number {
    let height: number = 0;
    let lineHeight: number = 36;

    if (this.errorsStatusCollapsed) {
      height = lineHeight;
    } else {
      if (this.gridView.errors.errors.length == 0) {
        height = 0;
      } else if (this.gridView.errors.errors.length <= 2) {
        height = this.gridView.errors.errors.length * lineHeight;
      } else if (this.errorsCollapsed) {
        height = 3 * lineHeight;
      } else {
        height = (this.gridView.errors.errors.length + 1) * lineHeight;
      }

      if (this.gridView.errors.warnings.length == 0) {
        height += 0;
      } else if (this.gridView.errors.warnings.length <= 2) {
        height += this.gridView.errors.warnings.length * lineHeight;
      } else if (this.warningsCollapsed) {
        height += 3 * lineHeight;
      } else {
        height += (this.gridView.errors.warnings.length + 1) * lineHeight;
      }

      height += lineHeight;
    }

    return height;
  }

  public state: DataSourceRequestState = {
    skip: 0,
    take: 100
  };

  public statePosition: DataSourceRequestState = {
    skip: 0,
    take: 10000,
    filter: {
      logic: 'and',
      filters: []
    }
  };

  public rawDataDownloadOptions: Array<any> = [{
    text: 'по секторам',
    click: () => {
      this.rawDataDownload('SalaryData_' + this.year + '_Sector.zip', DownloadRawDataFilterTypeEnum.Sector);
    }
  }, {
    text: 'по регионам',
    click: () => {
      this.rawDataDownload('SalaryData_' + this.year + '_Region.zip', DownloadRawDataFilterTypeEnum.Region);
    }
  }, {
    text: 'по фильтрам...',
    click: () => {
      this.openFilterRawDataUpload();
    }
  }];

  public excelDownloadOptions: Array<any> = [{
    text: 'Скачать текущую анкету',
    click: () => {
      this.onCurrentExcelDownload();
    }
  }, {
      text: 'Скачать исходную анкету',
    click: () => {
      this.onSourceExcelDownload();
    }
    }];

  private getArrayString(array: Array<any>, property: string): string {
    if (array.length == 1) return array[0][property];
    if (array.length == 2) return array[0][property] + ', ' + array[1][property];
    if (array.length > 2) return array[0][property] + ', ' + array[1][property] + ' ...';
  }

  public get sectorString(): string {
    return this.getArrayString(this.payWellSector, 'payWellSectorName');
  }

  public get questionaryStatusString(): string {
    return this.getArrayString(this.questionaryStatus, 'nameRu');
  }

  public get districtString(): string {
    return this.getArrayString(this.district, 'nameRu');
  }

  public get regionString(): string {
    return this.getArrayString(this.region, 'nameRu');
  }

  public get cityString(): string {
    return this.getArrayString(this.city, 'nameRu');
  }

  public opened: boolean = false;
  public openedPwcCodeSelect: boolean = false;
  public openedFilterRawDataUpload: boolean = false;
  public currentSalaryDataId: number;

  public constructor(
    injector: Injector,
    private formBuilder: FormBuilder,
    private translateService: TranslateService,
    private sanitizer: DomSanitizer,
    private dialogService: DialogService,
    private companyService: CompanyService,
    private payWellSectorService: PayWellSectorService,
    private positionService: PositionService,
    private bonusFrequencyService: BonusFrequencyService,
    private regionalAllowanceService: RegionalAllowanceService,
    private minimumWageService: MinimumWageService,
    private locationService: LocationService,
    private questionarySalaryService: QuestionarySalaryService,
    private questionaryStatusService: QuestionaryStatusService,
    private userService: UserService
  ) {
    super(injector);
  }

  ngOnInit() {
    this.innerHeight = window.innerHeight;
    const browserLang = this.translateService.getBrowserLang();
    this.translateService.use(browserLang.match(/en-US|ru/) ? browserLang : 'ru');
    this.localeId = browserLang;

    this.loadCompanies(true);

    this.positionService.getAll().subscribe(data => {
      this.positions = data;
    });

    this.bonusFrequencyService.getAll().subscribe(data => {
      this.bonusFrequencies.push(new ListItem());
      this.bonusFrequencies = this.bonusFrequencies.concat(data);
    });
    this.regionalAllowanceService.getAll().subscribe(data => { this.regionalAllowances = data; });
    this.minimumWageService.getAll().subscribe(data => { this.minimumWages = data; });
    this.userService.getAll().subscribe(data => {
      this.responsibles.push(new User({
        id: null,
        name: "<Не выбран>"
      }));
      this.responsibles = this.responsibles.concat(data);
    });
    this.questionarySalaryService.getYears().subscribe(data => {
      this.years = data;
      this.year = data[0];
      this.loadSurveyEndDate();
    });

    this.questionaryStatusService.getAll().subscribe(data => {
      this.questionaryStatuses.push(new ListItem({
        id: 0,
        nameRu: "Все статусы"
      }));
      this.questionaryStatus.push(this.questionaryStatuses[0]);
      this.questionaryStatuses = this.questionaryStatuses.concat(data);
      this.questionaryStatusesWithoutAll = data;
    });

    this.payWellSectorService.getAll().subscribe(data => {
      this.payWellSectors.push(new PayWellSector({
        id: 0,
        payWellSectorName: "Все сектора"
      }));
      this.payWellSector.push(this.payWellSectors[0]);
      this.payWellSectors = this.payWellSectors.concat(data);
    });

    this.locationService.getAllDistricts().subscribe(data => {
      this.districts.push(new LocationModel({
        id: 0,
        nameRu: "Все округа"
      }));
      this.district.push(this.districts[0]);
      this.districts = this.districts.concat(data.sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu)));
    });

    this.locationService.getAllRegions().subscribe(data => {
      this.regions.push(new LocationModel({
        id: 0,
        nameRu: "Все регионы"
      }));
      this.region.push(this.regions[0]);
      this.regions = this.regions.concat(data.sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu)));
    });

    this.locationService.getAllCities().subscribe(data => {
      this.cities.push(new LocationModel({
        id: 0,
        nameRu: "Все города"
      }));
      this.city.push(this.cities[0]);
      this.cities = this.cities.concat(data.sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu)));

      this.mskCityId = data.filter(x => x.nameRu.toLowerCase() === "москва")[0].id;
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerHeight = window.innerHeight;
  }

  public loadCompanies(resetCurrentQuestionary: boolean) {
    this.companyService.getAllByYear(this.year).subscribe(data => {
      this.companies = data;
    });
    if (resetCurrentQuestionary) {
      this.currentQuestionary = null;
    }
  }

  public loadSurveyEndDate()
  {
    this.questionarySalaryService.getSurveyEndDate(this.year).subscribe(data => {
      this.surveyEndDate = data;
    });
  }

  public allExceptMskChange(value: boolean) {
    if (value)
    {
      this.region = this.regions.filter(x => x.id != 0);
      this.city = this.cities.filter(x => x.id != this.mskCityId && x.id != 0);
    }

    this.loadItems();
  }

  public currentCompanyChange(company: Company) {
    if (this.grid) this.grid.cancelCell();
    this.state.filter = undefined;
    this.currentCompanyId = company.id;
    this.currentCompanyPayWellSectorId = company.payWellSectorId;    
    this.currentQuestionarySalaryId = company.questionarySalaryId;
    this.currentCompanyName = company.companyName;
    this.currentPayWellSectorName = this.payWellSectors.filter(x => x.id === company.payWellSectorId)[0].payWellSectorName;
    this.state.skip = 0;
    this.currentErrorTypeId = null;
    this.currentErrorType = null;
    this.errorsStatusCollapsed = false;
    this.loadQuestionaryHeader();								 
    this.loadItems();
    this.loadPositions();
    this.loadPositionsFilterData();
  }

  public getQuestionaryStatusById(statusId: number): string {
    return (this.questionaryStatuses.length > 0 && statusId > 0)
      ? this.questionaryStatuses.filter(x => x.id === statusId)[0].nameRu
      : "нет анкеты";
  }

  private loadQuestionaryHeader(): void {
    this.questionarySalaryService.getByQuestionarySalaryId(this.currentQuestionarySalaryId).subscribe(
      data => {
        this.currentQuestionary = data;
        this.currentQuestionary.status = this.questionaryStatuses.filter(x => x.id === data.statusId)[0];
        this.currentQuestionary.responsible = this.responsibles.filter(x => x.id === data.responsibleId)[0];
      }
    );
  }

  public fillRequestParams(): void {
    let data = toDataSourceRequest(this.state);
    this.request.data = data;
    this.request.companyId = this.currentCompanyId;
    this.request.year = this.year;
    this.request.errorTypeId = this.currentErrorTypeId;
    this.request.allExceptMsk = this.allExceptMsk;
    this.request.districtIds = this.district.map(x => x.id);
    this.request.regionIds = this.region.map(x => x.id);
    this.request.cityIds = this.city.map(x => x.id);
  }

  private loadItems(): void {
    this.loading = true;
    this.fillRequestParams();
    this.questionarySalaryService.getAllKendo(this.request)
      .subscribe(
      (result: GridDataResultEx) => {
        forEach(result.data, (value: SalaryData) => {
          if (value.employmentDate != null) value.employmentDate = moment.utc(value.employmentDate).toDate();
        });
        this.gridView = result;
        if (!this.isGridContainsCurrentError()) this.currentErrorTypeId = null;
        //this.showNotification("Загрузка успешна");
        this.loading = false;
        },
        error => {
          console.log(error.error.Message);
          this.showError(error.error.Message);
        }
      );
  }

  private loadPositions(): void {
    this.positionService.getAllKendo(this.currentCompanyPayWellSectorId, this.statePosition)
      .subscribe(
        (result: DataResult) => {
          this.gridPositionView = result;
          this.gridPositionData = result.data;
        },
        error => {
          console.log(error.error.Message);
          this.showError(error.error.Message);
        }
      );
  }

  public onYearChange(year: number): void {
    this.loadSurveyEndDate();
    this.companyService.getAllByYear(year).subscribe(
      data => {
        this.companies = data;
        this.currentQuestionary = null;
      },
      error => {
        console.log(error.error.Message);
        this.showError(error.error.Message);
      }
    );
  }

  public questionaryStatusChange(status: QuestionaryStatus): void {
    this.currentQuestionary.statusId = status.id;
    this.updateQuestionaryHeader();
  }

  public questionaryResponsiblePersonChange(user: User): void {
    this.currentQuestionary.responsibleId = user.id;
    this.updateQuestionaryHeader();
  }

  public questionaryTotalEmployeesFieldValueChange(): void {
    this.updateQuestionaryHeader();
  }

  public updateQuestionaryHeader(): void {
    if (!this.currentQuestionary.totalEmployeesFieldValue
      || this.currentQuestionary.totalEmployeesFieldValue <= 0) {
      this.showError("Введите число в поле 'Количество сотрудников'. Операция отменена.");
      return;
    }

    this.questionarySalaryService.updateQuestionaryHeader(this.currentQuestionary).subscribe(
      data => {
        this.companies.forEach(x => { if (x.id === this.currentQuestionary.companyId) x.statusId = this.currentQuestionary.statusId; });
        if (!this.isQuestionaryStatusVisible(this.currentQuestionary.statusId)) this.currentQuestionary = null;
        this.showNotification("Сохранено");
      },
      error => {
        console.log(error.error.Message);
        this.showError(error.error.Message);
      }
    );
  }

  public onPayWellSectorChange(value): void {
    if (value.length === 0) {
      this.payWellSector.push(new PayWellSector({
        id: 0,
        payWellSectorName: "Все сектора"
      }));
    } else {
      this.payWellSector = value.filter(x => x.id !== 0);
    }
    this.currentQuestionary = null;
  }

  public onPayWellSectorUploadChange(value): void {
    if (value.length === 0) {
      this.payWellSectorUpload.push(new PayWellSector({
        id: 0,
        payWellSectorName: "Все сектора"
      }));
    } else {
      this.payWellSectorUpload = value.filter(x => x.id !== 0);
    }
  }

  public onQuestionaryStatusChange(value): void {
    if (value.length === 0) {
      this.questionaryStatus.push(new ListItem({
        id: 0,
        nameRu: "Все сектора"
      }));
    } else {
      this.questionaryStatus = value.filter(x => x.id !== 0);
    }
    this.currentQuestionary = null;
  }

  private addAllDistricts(): void {
    this.district.push(new LocationModel({
      id: 0,
      nameRu: "Все округа"
    }));
  }

  public onDistrictChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.addAllDistricts();
    } else {
      this.district = value.filter(x => x.id !== 0);
      const newDistricts: Array<LocationModel> =
        this.district.filter(district => (this.districtPrev.find(districtP => districtP.id === district.id) == null));

      //заполнить вниз region
      this.region = this.region.filter(x => x.id != 0).concat(this.regions.filter(region => (newDistricts.find(district => district.id === region.districtId) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu)));
      if (this.region.length === 0) this.addAllRegions();

      this.regionPrev = [];
      this.regionPrev = this.regionPrev.concat(this.region);

      //заполнить вниз city
      this.city = this.cities.filter(city => (this.region.find(region => region.id === city.regionId) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu));
      if (this.city.length === 0) this.addAllCities();

      this.districtPrev = [];
      this.districtPrev = this.districtPrev.concat(this.district);
    }
    this.loadItems();
  }

  public onDistrictUploadChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.districtUpload.push(new LocationModel({
        id: 0,
        nameRu: "Все округа"
      }));
    } else {
      this.districtUpload = value.filter(x => x.id !== 0);
    }
  }

  private addAllRegions(): void {
    this.region.push(new LocationModel({
      id: 0,
      nameRu: "Все регионы"
    }));
  }

  public onRegionChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.addAllRegions();
    } else {
      this.region = value.filter(x => x.id !== 0);
      const newRegions: Array<LocationModel> =
        this.region.filter(region => (this.regionPrev.find(regionP => regionP.id === region.id) == null));

      //заполнить вниз city
      this.city = this.city.filter(x => x.id != 0).concat(this.cities.filter(city => (newRegions.find(region => region.id === city.regionId) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu)));
      if (this.city.length === 0) this.addAllCities();

      //заполнить вверх district
      this.district = this.districts.filter(district => (this.region.find(region => region.districtId === district.id) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu));
      if (this.district.length === 0) this.addAllDistricts();

      this.regionPrev = [];
      this.regionPrev = this.regionPrev.concat(this.region);
    }
    this.loadItems();
  }

  public onRegionUploadChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.regionUpload.push(new LocationModel({
        id: 0,
        nameRu: "Все регионы"
      }));
    } else {
      this.regionUpload = value.filter(x => x.id !== 0);
    }
  }

  private addAllCities(): void {
    this.city.push(new LocationModel({
      id: 0,
      nameRu: "Все города"
    }));
  }

  public onCityChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.addAllCities();
      this.region = [];
      this.addAllRegions();
    } else {
      this.city = value.filter(x => x.id !== 0);

      //заполнить вверх region
      this.region = this.regions.filter(region => (this.city.find(city => city.regionId === region.id) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu));
      if (this.region.length === 0) this.addAllRegions();

      this.regionPrev = [];
      this.regionPrev = this.regionPrev.concat(this.region);

      //заполнить вверх district
      this.district = this.districts.filter(district => (this.region.find(region => region.districtId === district.id) != null))
        .sort((a, b) => ('' + a.nameRu).localeCompare(b.nameRu));
      if (this.district.length === 0) this.addAllDistricts();

      this.districtPrev = [];
      this.districtPrev = this.districtPrev.concat(this.district);
    }
    this.loadItems();
  }

  public onCityUploadChange(value: Array<LocationModel>): void {
    if (value.length === 0) {
      this.cityUpload.push(new LocationModel({
        id: 0,
        nameRu: "Все города"
      }));
    } else {
      this.cityUpload = value.filter(x => x.id !== 0);
    }
  }

  public onCompanyFilterChange(filter: string): void {
    this.companiesFilter = this.companies.filter((s) => s.companyName.toLowerCase().indexOf(filter.toLowerCase()) !== -1);
  }

  public onCompanyChange(value): void {
    this.currentQuestionary = null;
    this.companiesFilter = [];
    this.companyFilter = value;
  }

  public onPwcCodeFilterChange(filter: string, useAllProperties: boolean): void {
    this.gridPositionsFilter = this.gridPositionData.filter((s) => (useAllProperties)
      ? s.allPropertyValues.toLowerCase().indexOf(filter.toLowerCase()) !== -1
      : s.pwCPositionCode.toLowerCase().indexOf(filter.toLowerCase()) !== -1
    );
  }

  public onPwcCodeChange(value: string): void {
    if (value.length == 0) {
      this.clearPositionGridFilters();
    } else {
      let firstSeparatorIndex: number = value.indexOf(' | ');
      let code: string = value.substr(0, firstSeparatorIndex);
      this.statePosition.filter.filters = [];
      this.statePosition.filter.filters.push({ filters: [{ field: 'pwCPositionCode', operator: 'eq', value: code }], logic: 'and' });
      this.gridPositionView = process(this.gridPositionData, this.statePosition);
    }
  }

  public positionEx(pwCPositionCode: string, pwCStandardPositionId: number): PositionEx {
    return this.gridPositionsFilter.find(x => x.pwCPositionCode === pwCPositionCode || x.id === pwCStandardPositionId);
  }

  public onPwcCodeChangeInCell(value: string): void {
    this.formGroup.controls.pwCPositionCode.setValue(value);
    let position: PositionEx = this.positionEx(value, null);
    this.formGroup.controls.pwCStandardPositionId.setValue((position) ? position.id : null);
  }

  public clearPositionGridFilters(): void {
    this.statePosition.filter.filters = [];
    this.gridPositionView = process(this.gridPositionData, this.statePosition);
  }

  public onPwcGridCellClickHandler({ sender, rowIndex, columnIndex, dataItem, isEdited }) {
    this.openedPwcCodeSelect = false;

    const newPwcId: number = dataItem.id;
    const index: number = itemIndex({ id: this.currentSalaryDataId }, this.gridView.data);
    let item: SalaryData = this.gridView.data[index];
    item.pwCStandardPositionId = newPwcId;
    item.pwCPositionCode = dataItem.pwCPositionCode;

    this.update(item);
  }

  public isPayWellSectorVisible(payWellSectorId: number): boolean {
    return this.payWellSector.length === 0 || this.payWellSector.find(x => x.id === 0 || x.id === payWellSectorId) != null;
  }

  public isQuestionaryStatusVisible(statusId: number): boolean {
    return this.questionaryStatus.length === 0 || this.questionaryStatus.find(x => x.id === 0 || x.id === statusId) != null;
  }

  public isCompanyNameVisible(companyName: string): boolean {
    return this.companyFilter.length === 0 || companyName.toLowerCase().indexOf(this.companyFilter.toLowerCase()) !== -1
  }

  public isCompanyVisible(c: Company, payWellSectorId: number): boolean {
    return c.payWellSectorId == payWellSectorId
      && this.isPayWellSectorVisible(c.payWellSectorId)
      && this.isQuestionaryStatusVisible(c.statusId)
      && this.isCompanyNameVisible(c.companyName);
  }

  public getFilterCompanies(payWellSectorId: number): Array<Company> {
    return this.companies.filter(c => this.isCompanyVisible(c, payWellSectorId));
  }

  public allCompaniesAreReady(payWellSectorId: number): boolean {
    const filteredCompanies = this.companies.filter(c => this.isCompanyVisible(c, payWellSectorId));
    return (filteredCompanies.length > 0 && filteredCompanies.every(c => c.statusId == QuestionaryStatusEnum.ReadyToDeliver));
  }

  public getFilterCompaniesIds(): Array<number> {
    let ids = [];

    forEach(this.payWellSectors, (payWellSector: PayWellSector) => {
      let filterCompanies = this.getFilterCompanies(payWellSector.id);
      forEach(filterCompanies, (company: Company) => {
        ids.push(company.id);
      });
    });

    return ids;
  }

  public onRawDataDownload(): void {
    this.rawDataDownload('SalaryData_' + this.year + '.zip', DownloadRawDataFilterTypeEnum.All);
  }

  public rawDataDownload(fileName: string, filterType: number, companyIds?: Array<number>,
    payWellSectorIds?: Array<number>, districtIds?: Array<number>, regionIds?: Array<number>, cityIds?: Array<number>): void {
    let request: DownloadRawDataRequest = new DownloadRawDataRequest({
      year: this.year, filterType: filterType, companyIds: companyIds,
      payWellSectorIds: payWellSectorIds, districtIds: districtIds, regionIds: regionIds, cityIds: cityIds
    })
    this.questionarySalaryService.downloadRawData(request, fileName).subscribe(
      res => {
        if (res.statusOK) {
          this.downloadFile(res);
        } else {
        const dialog: DialogRef = this.dialogService.open({
          title: 'Ошибки в анкетах',
          content: 'В выгружаемых данных были найдены ошибки. Подробная информация доступна на странице списка анкет. Все равно выполнить выгрузку?',
          actions: [
            { text: 'Да', primary: true },
            { text: 'Отменить' }
          ],
          width: 450,
          height: 200,
          minWidth: 250
        });

          dialog.result.subscribe((result: DialogAction) => {
          if (result.text == 'Да') this.downloadFile(res);
          });
        }
      },
      error => {
        console.log(error.error.Message);
        this.showError(error.error.Message);
      }
    );
  }

  public downloadFile(res: any): void {
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(res.data, res.filename);
    } else {
      const link = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = link;
      a.download = res.filename;
      a.click();
      window.URL.revokeObjectURL(link);
      a.remove();
    }

    this.showNotification('Файл сохранен браузером');
  }

  public onClearFilters(): void {
    this.state.filter = undefined;
    this.payWellSector = [this.payWellSectors[0]];
    this.district = [this.districts[0]];
    this.region = [this.regions[0]];
    this.city = [this.cities[0]];
    this.questionaryStatus = [this.questionaryStatuses[0]];
    this.companiesFilter = [];
    this.companyFilter = "";
    this.txtCompanyFilter.reset();
    this.allExceptMsk = false;
    this.loadItems();
  }

  public onCurrentExcelDownload(): void {
    window.location.href = this.questionarySalaryService.getLinkWithParam("DownloadCurrentQuestionaryFile", this.currentQuestionary.id.toString());
    this.showNotification('Файл текущей анкеты сохранен браузером');
  }

  public onSourceExcelDownload(): void {
    window.location.href = this.questionarySalaryService.getLinkWithParam("DownloadQuestionaryFile", this.currentQuestionary.id.toString());
    this.showNotification('Файл исходной анкеты сохранен браузером');
  }

  public onFullScreen(): void {
    this.fullScreen = !this.fullScreen;
    this.fullScreenChange.emit(this.fullScreen);
  }

  public onChangeFilterPanel(event, viewMode: boolean): void {
    let id = event.target.id;
    if (viewMode || id == 'divFilterSelectors' || id == 'divFilterButtons') {
      this.filterPanelEditMode = !this.filterPanelEditMode;
    }
  }

  public onChangeQuestionaryFilterPanel(event, viewMode: boolean): void {
    let id = event.target.id;
    if (viewMode || id == 'divQuestionaryFilterSelectors') {
      this.questionaryFilterPanelEditMode = !this.questionaryFilterPanelEditMode;
    }
  }

  public closePwcCodeSelect(status) {
    this.openedPwcCodeSelect = false;
  }

  public openFilterRawDataUpload() {
    this.openedFilterRawDataUpload = true;
    this.payWellSectorUpload = [this.payWellSectors[0]];
    this.districtUpload = [this.districts[0]];
    this.regionUpload = [this.regions[0]];
    this.cityUpload = [this.cities[0]];
  }

  public closeFilterRawDataUpload(status) {
    this.openedFilterRawDataUpload = false;
    if (status == 'success') {
      let payWellSectorIds = this.payWellSectorUpload.map(x => x.id);
      let districtIds = this.districtUpload.map(x => x.id);
      let regionIds = this.regionUpload.map(x => x.id);
      let cityIds = this.cityUpload.map(x => x.id);

      this.rawDataDownload('SalaryData_' + this.year + '_Filter.zip', DownloadRawDataFilterTypeEnum.Filter,
        this.getFilterCompaniesIds(), payWellSectorIds, districtIds, regionIds, cityIds);
    }
  }

  public getCityNameById(id: number): any {
    return this.cities.find(x => x.id === id);
  }

  public getRegionNameById(id: number): any {
    return this.regions.find(x => x.id === id);
  }

  public getDistrictNameById(id: number): any {
    return this.districts.find(x => x.id === id);
  }

  public bonusFrequency(id: number): any {
    return this.bonusFrequencies.find(x => x.id === id);
  }

  public position(pwCStandardPositionId: number): Position {
    return this.positions.find(x => x.id === pwCStandardPositionId);
  }

  public hasCellError(errors: Array<Error>, index: number, type: number): boolean {
    let cellError = errors.find(x => x.index === index && x.type === type);
    return (cellError != undefined);
  }

  public getCellError(errors: Array<Error>, index: number, type: number): string {
    let cellError = errors.find(x => x.index === index && x.type === type);
    return (cellError) ? cellError.message : '';
  }

  public dataStateChange(state: DataStateChangeEvent) {
    this.state = state;
    this.loadItems();
  }

  public dataStateChangePosition(state: DataStateChangeEvent) {
    this.statePosition = state;
    this.gridPositionView = process(this.gridPositionData, this.statePosition);
  }

  public scrollBottomHandler(event) {
    if ((this.state.skip + this.state.take) >= this.gridView.total) return;
    this.state.skip += this.state.take;
    this.loadItems();
  }

  public cellClickHandler({ sender, rowIndex, columnIndex, dataItem, isEdited }) {
    let item: SalaryData = dataItem;
    if (!isEdited) {
      this.formGroup = this.createFormGroup(dataItem);
      sender.editCell(rowIndex, columnIndex, this.formGroup);
    }
  }

  public openGridPositionsPopup(pwCStandardPositionId: number, currentSalaryDataId: number) {
    this.currentSalaryDataId = currentSalaryDataId;
    this.clearPositionGridFilters();
    this.openedPwcCodeSelect = true;
    this.pwcPositionSelection = [pwCStandardPositionId];
    let itemExistsInList: boolean = this.positionEx(null, pwCStandardPositionId) != null;
    if (itemExistsInList) {
      setTimeout(() =>
        document.querySelector('#gridPositions .k-state-selected').scrollIntoView()
      );
    }
  }

  public cellCloseHandler(args: any) {
    const { formGroup, dataItem } = args;
    if (!formGroup.valid) {
      args.preventDefault();
    } else if (formGroup.dirty) {
      this.assignValues(dataItem, formGroup.value);
      this.update(dataItem);
    }
  }

  public getRegionalAllowanceCellColor(dataItem: SalaryData): SafeStyle {
    let coefficients = this.regionalAllowances
      .filter((item) => (
        item.cityId === dataItem.cityId &&
        moment(item.date).isSameOrBefore(moment())
      ))
      .sort((a, b) => { return a.date > b.date ? -1 : a.date < b.date ? 1 : 0 });

    let isError = (
      coefficients.length > 0 &&
      coefficients[0].amount > 1 &&
      dataItem.regionalAllowance < dataItem.salary * (coefficients[0].amount - 1));

    let result = (isError) ? '#FFE2D5' : '#FFFFFF';
    return this.sanitizer.bypassSecurityTrustStyle(result);
  }

  public getSalaryCellColor(dataItem: SalaryData): SafeStyle {
    let wages = this.minimumWages
      .filter((item) => (
        item.cityId === dataItem.cityId &&
        moment(item.date).isSameOrBefore(moment())
      ))
      .sort((a, b) => { return a.date > b.date ? -1 : a.date < b.date ? 1 : 0 });

    let isError = (
      wages.length > 0 &&
      dataItem.salary < wages[0].amount);

    let result = (isError) ? '#FFE2D5' : '#FFFFFF';
    return this.sanitizer.bypassSecurityTrustStyle(result);
  }

  public getStatusStyle(statusId: number): any {
    return {
      'background-color': this.getStatusBgColor(statusId),
      'color': this.getStatusColor(statusId),
      'border-radius': '5px',
      'padding': '5px',
      'text-transform': 'lowercase'
    }
  }

  public getStatusBgColor(statusId: number): string {
    switch (statusId) {
      case QuestionaryStatusEnum.New:
        return '#C6E8FF';
      case QuestionaryStatusEnum.Enhancing:
        return '#FFD942';
      case QuestionaryStatusEnum.Checked:
        return '#42B4FF';
      case QuestionaryStatusEnum.ReadyToDeliver:
        return '#66CC99';
    }
    return '#FFFFFF';
  }

  public getStatusColor(statusId: number): string {
    switch (statusId) {
      case QuestionaryStatusEnum.New:
        return '#333333';
      case QuestionaryStatusEnum.Enhancing:
        return '#333333';
      case QuestionaryStatusEnum.Checked:
        return '#FFFFFF';
      case QuestionaryStatusEnum.ReadyToDeliver:
        return '#FFFFFF';
    }
    return '#000000';
  }

  public onErrorsStatusCollapsedClick(): void {
    this.errorsStatusCollapsed = !this.errorsStatusCollapsed;
  }

  public onErrorsCollapsedClick(): void {
    this.errorsCollapsed = !this.errorsCollapsed;
  }

  public onWarningsCollapsedClick(): void {
    this.warningsCollapsed = !this.warningsCollapsed;
  }

  public onHideSelectedErrorClick(): void {
    this.onErrorTitleClick(this.currentErrorType);
  }

  public onErrorTitleClick(errorType: RowError): void {
    if (this.currentErrorTypeId != errorType.id) this.state.skip = 0;
    if (errorType.id != this.currentErrorTypeId) {
      this.currentErrorTypeId = errorType.id;
      this.currentErrorType = errorType;
      this.showSelectedError = true;
    } else {
      this.currentErrorTypeId = null;
      this.currentErrorType = null;
      this.showSelectedError = false;
    }
    this.loadItems();
  }

  public isGridContainsCurrentError(): boolean {
    let hasError: boolean = this.gridView.errors.errors.find(x => x.id === this.currentErrorTypeId) != null;
    let hasWarning: boolean = this.gridView.errors.warnings.find(x => x.id === this.currentErrorTypeId) != null;
    return (hasError || hasWarning);
  }

  public assignValues(target: any, source: any): void {
    Object.assign(target, source);
  }

  public update(item: any): void {
    const index = itemIndex(item, this.gridView.data);
    if (index !== -1) {
      this.gridView.data.splice(index, 1, item);
      this.questionarySalaryService.update(item).subscribe(
        data => {
          //this.showNotification("Сохранено");
          this.loadItems();
          this.loadCompanies(false);
          this.loadPositionsFilterData();
        },
        error => {
          console.log(error.error.Message);
          this.showError(error.error.Message);
        }
      );
    }
  }

  public cancelHandler({ sender, rowIndex }) {
    sender.closeRow(rowIndex);
  }

  public close(status) {
    this.opened = false;
    //if (status == "success") {
    this.loadCompanies(true);
    /*this.showNotification("Анкета(ы) загружена(ы) успешно!");
  } else {
    this.showNotification("Загрузка анкет(ы) отменена");
  }*/
  }

  public open() {
    this.opened = true;
  }

  public saveHandler({ sender, formGroup, rowIndex }) {
    if (formGroup.valid) {
      sender.closeRow(rowIndex);
    }
  }

  public createFormGroup(dataItem: SalaryData): FormGroup {
    return this.formBuilder.group({
      'id': [dataItem.id],
      'hfid': [dataItem.hfid],
      'department': [dataItem.department, Validators.required],
      'position': [dataItem.position, Validators.required],
      'grade': [dataItem.grade],
      'subordinateCount': [dataItem.subordinateCount, [Validators.min(0)]],
      'pwCStandardPositionId': [dataItem.pwCStandardPositionId],
      'pwCPositionCode': [dataItem.pwCPositionCode],
      'functionalDeviation': [dataItem.functionalDeviation, Validators.required],
      'cityId': [dataItem.cityId],
      'regionId': [dataItem.regionId],
      'districtId': [dataItem.districtId],
      'salary': [dataItem.salary, [Validators.required, Validators.min(0)]],
      'regionalAllowance': [dataItem.regionalAllowance, [Validators.min(0)]],
      'guaranteedBonus': [dataItem.guaranteedBonus, [Validators.min(0)]],
      'otherPayments': [dataItem.otherPayments, [Validators.min(0)]],
      'bonusPrivilege': [dataItem.bonusPrivilege, Validators.required],
      'practicalBonus': [dataItem.practicalBonus, [Validators.min(0)]],
      'targetBonus': [dataItem.targetBonus, [Validators.min(0)]],
      'commissionCharge': [dataItem.commissionCharge, [Validators.min(0)]],
      'targetCommissionCharge': [dataItem.targetCommissionCharge, [Validators.min(0)]],
      'bonusFrequencyId': [dataItem.bonusFrequencyId],
      'employmentDate': [dataItem.employmentDate],
      'comment': [dataItem.comment],
      'additionalColumnData': [dataItem.additionalColumnData]
    });
  }

  public positionsValueChange(values: any[], filterService: FilterService): void {
    this.state.filter = undefined;
    filterService.filter({
      filters: values.map(value => ({
        field: 'PwCStandardPositionId',
        operator: 'eq',
        value: value.id
      })),
      logic: 'or'
    });
  }

  public positionsFilters(filter: CompositeFilterDescriptor): FilterDescriptor[] {
    this.positionsFilter.splice(
      0, this.positionsFilter.length,
      ...flatten(filter).map(({ value }) => value)
    );
    return this.positionsFilter;
  }

  public positionsFilterChange(filter: any): void {
    this.positionsFilterMultiSelect = this.positionsFilterMultiSelectCurrent.filter((s) => s.pwCPositionCode.toLowerCase().indexOf(filter.toLowerCase()) !== -1);
  }

  public loadPositionsFilterData() {
    this.positionService.getAllByQuestionarySalary(this.currentQuestionarySalaryId).subscribe(data => { 
      this.positionsFilterMultiSelect = data; 
      this.positionsFilterMultiSelectCurrent = data;
    });
  }

  public getCellErrorColor(errors: Array<Error>, index: number, type: number): string {

    let cellError = errors.find(x => x.index === index && x.type === type);
    return (cellError) ? this.getIconColor(cellError.iconColor) : 'sandybrown';
  }

  public getIconColor(iconColor: number): string {
    if(iconColor == 1) return "red";
    if(iconColor == 2) return "green"; 
    return 'sandybrown';
  }
}

@Injectable()
export class UploadInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url !== 'removeUrl') {
      const events: Observable<HttpEvent<any>>[] = [0, 30, 60, 100].map((x) => of(<HttpProgressEvent>{
        type: HttpEventType.UploadProgress,
        loaded: x,
        total: 100
      }).pipe(delay(1000)));
      const success = of(new HttpResponse({ status: 200 })).pipe(delay(1000));
      events.push(success);

      return concat(...events);
    }

    if (req.url === 'removeUrl') {
      return of(new HttpResponse({ status: 200 }));
    }

    return next.handle(req);
  }
}
