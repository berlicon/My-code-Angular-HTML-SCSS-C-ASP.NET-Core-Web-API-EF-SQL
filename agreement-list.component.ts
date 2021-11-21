import { Component, ViewChild, ViewContainerRef, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/shared/components/base.component';
// *** УДАЛИЛ ПОХОЖИЙ КОД ***
import { cloneDeep, orderBy, uniq, clone, sortBy } from 'lodash';
import { TreeItemsContainer } from 'src/app/shared/classes/tree-items-container';
import { forkJoin, Subscription } from 'rxjs';
// *** УДАЛИЛ ПОХОЖИЙ КОД ***
import { DatePipe } from '@angular/common';
import { formatNumber } from '@telerik/kendo-intl';
import { IntlService, CldrIntlService } from '@progress/kendo-angular-intl';
import { TooltipDirective } from '@progress/kendo-angular-tooltip';
import { GridDataResult, PagerSettings, SelectableSettings, SortSettings, PageChangeEvent, SelectionEvent, GridComponent } from '@progress/kendo-angular-grid';
import { SortDescriptor, GroupDescriptor, groupBy, GroupResult } from '@progress/kendo-data-query';
import { NotificationService } from '@progress/kendo-angular-notification';
// *** УДАЛИЛ ПОХОЖИЙ КОД ***
import { environment } from 'src/environments/environment';
import { saveAs } from '@progress/kendo-file-saver';
import { base64StringToBlob } from 'blob-util';

@Component({
    selector: 'app-agreement-list',
    templateUrl: './agreement-list.component.html',
    styleUrls: ['./agreement-list.component.scss']
})
export class AgreementListComponent extends BaseComponent implements OnInit {
    ID_ALL = -1;
    @ViewChild('grid') grid: GridComponent;
    @ViewChild('dialogContainer', { read: ViewContainerRef }) dialogContainerRef: ViewContainerRef;
    @ViewChild(TooltipDirective) public tooltipDir: TooltipDirective;

    isFilterExpanded = false;
    isDataLoading = false;

    skip = 0;
    pageSize = 20;
    gridView: GridDataResult;

    subscriptions: {
        refreshDataSubscription?: Subscription;
        excelDataSubscription?: Subscription;
    } = {};

    pageableSettings: PagerSettings = {
        pageSizes: [ 5, 10, 20, 50, 70, 100 ],
        info: true,
        previousNext: true
    };

    selectableSettings: SelectableSettings = {
        mode: 'single'
    };

    sortSettings: SortSettings = {
        allowUnsort: true,
        mode: 'multiple'
    };

    gridSort: SortDescriptor[] = [
        { field: 'idAgreementMain', dir: 'desc' },
        { field: 'isMain', dir: 'desc' },
        { field: 'idAgreement', dir: 'desc' },
    ];

    gridGroups: GroupDescriptor[] = [
        { field: 'idAgreementMain' }
    ];

    agreementStatus: FlatItemsContainer<AgreementStatusModel> = new FlatItemsContainer([], {});

    columns: AgreementListColumn[] = [];
    selectedAgreement: AgreementListItem;

    legaciesMultiselect: LegacyPayment[] = [];
    cfosMultiselect: Cfo[] = [];
    budgetItemsMultiselect: BudgetItem[] = [];
    tagsMultiselect: AgreementTagModel[] = [];

    filters: AgreementListFilterModel = {
        idAgreement: null,
        amountFrom: null,
        amountTo: null,
        date: null,
        idsAgreementStatus: [],
        contractorName: null,
        signerName: null,
        idsBudgetItem: [],
        idsCfo: [],
        idsLegacy: [],
        isHolding: false,
        name: null,
        quickFilter: null,
        side2AgreementNumber: null,
        idInternal: null,
        basisBCNumber: null,
        basisTCNumber: null,
        idCurrency: 19,
        tags: [],
        sortFields: '',
        isInWork: false
    };

    dicts: {
        legacies: FlatItemsContainer<LegacyPayment>;
        budgetItems: TreeItemsContainer<BudgetItem>;
        cfos: TreeItemsContainer<Cfo>;
        currencies: FlatItemsContainer<Currency>;
        tags: FlatItemsContainer<AgreementTagModel>
    } = {
            legacies: new FlatItemsContainer<LegacyPayment>([], {}),
            budgetItems: new TreeItemsContainer<BudgetItem>([], {}),
            cfos: new TreeItemsContainer<Cfo>([], {}),
            currencies: new FlatItemsContainer<Currency>([], {}),
            tags: new FlatItemsContainer<AgreementTagModel>([], {})
        };

    quickFilters: {
        name: string,
        type: AgreementListFilter,
        value?: any,
        tagColor?: AgreementTagColor
    }[] = [];

    constructor(
        private baseService: BaseService,
        private dialogService: DialogService,
        @Inject(LOCALE_ID) public localeId: string,
        private staticDictionaryService: StaticDictionaryService,
        private mb: MessageBoxService,
        private agreementService: AgreementService,
        private legacyService: LegacyService,
        private datePipe: DatePipe,
        private intlService: IntlService,
        private spinner: NgxSpinnerService,
        private notificationService: NotificationService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        super(baseService);

        // Получаем ключевые настройки
        this.refreshLocale();

        this.refreshDictionaries().then( () => {
            // this.subscribeEvents();
            this.initDefaults(route.snapshot.params);
            this.refreshData();
            this.processQuickFilters();
        });
    }

    ngOnInit(): void {
      this.baseService.setAppTitle(this.baseService.getTrn('AgreementList.Title'));
    }

    initDefaults(routeParams: Params) {
        // Для всех выводим статус "Согласование" по умолчанию
        this.filters.idsAgreementStatus = [ AgreementStatusDD.Accepting ];

        // Если есть параметры
        if (routeParams) {
            if (routeParams['mode'] && routeParams['mode'] === 'my') {
                this.filters.isInWork = true;
            }
        }
    }

    clearFilter() {
        this.filters = {
            idAgreement: null,
            amountFrom: undefined,
            amountTo: undefined,
            date: undefined,
            idsAgreementStatus: [],
            contractorName: undefined,
            signerName: undefined,
            idsBudgetItem: [],
            idsCfo: [],
            idsLegacy: [],
            isHolding: false,
            name: undefined,
            quickFilter: null,
            side2AgreementNumber: undefined,
            idInternal: undefined,
            basisBCNumber: undefined,
            basisTCNumber: undefined,
            idCurrency: 19,
            tags: [],
            sortFields: '',
            isInWork: false
        };

        if (!this.isFilterExpanded) {
            this.processQuickFilters();
        }

        this.filterChanged();
    }


    exportToExcel() {
      this.isDataLoading = true;
      const messageBoxSubscription = this.mb.open({
        title: this.translate('App.Warning'),
        text: this.translate('AgreementList.MaxLimit'),
        target: MessageBoxTarget.Standard,
        mode: MessageBoxMode.OK,
      }).subscribe();

      return new Promise((resolve, reject) => {
        this.filters.userIdIndividualPerson = this.baseService.currentUser.individualPerson.id;
        this.filters.userLocalDate = new Date();

        // Отменяем предыдущий запрос
        if (this.subscriptions.excelDataSubscription) {
          this.subscriptions.excelDataSubscription.unsubscribe();
          this.subscriptions.excelDataSubscription = undefined;
        }

        this.subscriptions.excelDataSubscription = this.agreementService.exportAgreementList(this.filters, this.language.id).subscribe(
          (reportFile) => {
            const fileData = base64StringToBlob(reportFile.content, reportFile.contentType);
            saveAs(fileData, reportFile.fileName);
            this.isDataLoading = false;
            messageBoxSubscription.unsubscribe();
            resolve();
          },
          (error) => {
            this.isDataLoading = false;
            messageBoxSubscription.unsubscribe();
            reject();
            this.mb.open({
              title: this.translate('App.Error'),
              text: error.error,
              target: MessageBoxTarget.Error
            }).subscribe();
          }
        );
      });
    }

// *** УДАЛИЛ ПОХОЖИЙ КОД ***
    refreshLocale() {
        if (this.language) {
          this.localeId = this.language.locale;
          (<CldrIntlService>this.intlService).localeId = this.language.locale;
        }
    }

    processQuickFilters() {
        const quickFiltersLocal = [];

        // Статус
        if (this.filters.idsAgreementStatus && this.filters.idsAgreementStatus.length !== 0) {

            const statusLabel = this.translate('Agreement.Status');
            this.filters.idsAgreementStatus.forEach(item => {
                const statusName = this.agreementStatus.dictItems[item].name;

                quickFiltersLocal.push({ name: statusLabel + ': ' + statusName, type: AgreementListFilter.Status, value: item });
            });
        }

        // Тэги
        if (this.filters.tags && this.filters.tags.length !== 0) {
            const tagLabel = this.translate('AgreementList.Tag');
            this.filters.tags.forEach(item => {
                const tagColor = this.defineTagColor(item.idAgreementTagType, item.idTag);
                quickFiltersLocal.push({ name: tagLabel + ': ' + item.name, type: AgreementListFilter.Tag, value: item, tagColor });
            });
        }

        // Показать договоры с резервами
        if (this.filters.isHolding) {

            const isHolding = this.translate('AgreementList.IsHolding');
            quickFiltersLocal.push({name: isHolding, type: AgreementListFilter.Holding});
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***
        this.quickFilters = quickFiltersLocal;
    }

    getUrlName(dataItem: AgreementListItem, fieldName: string): string {
        if (!dataItem || !fieldName) {
            return '';
        }

        switch (fieldName) {
            case 'agreementSZLink':
            case 'agreementPCSZLink':
                return dataItem[fieldName] ? extractLinkName(dataItem[fieldName]) : '';
            case 'agreementJiraLink':
                return dataItem[fieldName] ? extractJiraLinkName(dataItem[fieldName]) : ''; 
            default:
                return dataItem[fieldName] ? dataItem[fieldName] : '';
        }
    }

    getUrl(dataItem: AgreementListItem, fieldName: string): string {
        if (!dataItem || !fieldName) {
            return '';
        }
    
        switch (fieldName) {
            case 'idExternalAgreement':
                return (environment && environment.ddAgreementUrl && dataItem.idExternalAgreement)
                ? `${environment.ddAgreementUrl}${dataItem.idExternalAgreement}` : '';
            case 'agreementSZLink':
            case 'agreementPCSZLink':
                return dataItem[fieldName] ? extractLinkUrl(dataItem[fieldName]) : '';
            case 'agreementJiraLink':
                return dataItem[fieldName] ? dataItem[fieldName] : '';
            case 'idAgreement':
                return dataItem.idAgreement ? `/agreement/view/${dataItem.idAgreement}` : '';
            default:
                return '';
        }
    }

    // Определить цвет, для раскраски тэга
    defineTagColor(idAgreementTagType: AgreementTagType, idTag: AgreementStatus|AgreementPurchaseType): AgreementTagColor {
        if (idAgreementTagType === AgreementTagType.Status && idTag === AgreementStatus.New) { 
            return AgreementTagColor.Green;
        } else if (idAgreementTagType === AgreementTagType.Status && idTag === AgreementStatus.InProcess) { 
            return AgreementTagColor.Orange;
        } else if (idAgreementTagType === AgreementTagType.PurchaseType && idTag === AgreementPurchaseType.Tender) { 
          return AgreementTagColor.Brown;
        } else if (idAgreementTagType === AgreementTagType.Hold) { 
          return AgreementTagColor.Hold;
        } else {
            return AgreementTagColor.Default;
        }
    }

    formatInputNumber(value: number, format: string) {
        return formatNumber(value, format, this.localeId);
    }

    expandFilter() {
        // Добавляем все быстрые фильтры, которые у нас есть, только если сворачиваем иначе не перерисовываем их
        if (this.isFilterExpanded) {
            this.processQuickFilters();
        }

        this.isFilterExpanded = !this.isFilterExpanded;
    }

    showTooltip(e: any): void {
        if (e.target.nodeName === 'TD' && e.target.offsetWidth < e.target.scrollWidth) {
          this.tooltipDir.toggle(e.target);
        } else {
          this.tooltipDir.hide();
        }
    }

    public pageChange(event: PageChangeEvent): void {
        this.pageSize = event.take;
        this.skip = event.skip;
        this.refreshData();
    }

    public onGridSortChange(sort: SortDescriptor[]): void {
        this.gridSort = sort;
        this.refreshData();
    }

    onGridSelectionChange(event: SelectionEvent) {
        this.selectedAgreement = undefined;
        
        if (event.selectedRows.length === 1) {
          const item = event.selectedRows[0].dataItem as AgreementListItem;
  
          if (item) {
            this.selectedAgreement = item;
            // TODO обработка кнопок
          }
        }
    }

    onGridDoubleClick(event: any) {
        const className = (event.toElement || event.target || {}).className;

        if (!!className && (className === 'grid-cell ng-star-inserted' || className === 'grid-cell-center ng-star-inserted')) {
          if (this.selectedAgreement) {
            window.open(`/agreement/view/${this.selectedAgreement.idAgreement}`, '_blank');
          }
        }
    }

    // *** УДАЛИЛ ПОХОЖИЙ КОД ***

    refreshDictionaries() {
        return new Promise((resolvePromise, rejectPromise) => {
            forkJoin(
                this.staticDictionaryService.getAgreementStatusDD(this.language.id),
                // this.staticDictionaryService.getPaymentRequestRouteStatus(this.language.id),
                this.agreementService.getAgreementListColumns(),
                
                this.legacyService.getLegaciesPaymentContainer(this.language.id),
                this.staticDictionaryService.getCfos(this.language.id),
                this.staticDictionaryService.getBudgetItems(this.language.id),
                this.staticDictionaryService.getCurrency(),
                this.staticDictionaryService.getAgreementTags(this.language.id)
            )
            .subscribe(
                (success) => {
                    this.agreementStatus = success[0];
                    // this.paymentRequestRouteStatus = success[1];
                    this.columns = success[1];

                    this.dicts.legacies = success[2].cloneWithNewData(success[2].sourceItems.filter(item => item.isUseForRequestSearch));
                    
                    const cfos = success[3].filter(item => item.idStatus === ECfoStatus.Active || item.idStatus === ECfoStatus.Closed);
                    this.dicts.cfos = new TreeItemsContainer<Cfo>(cfos, {
                        filterByFields: [ 'name', 'code' ],
                        orderByFields: [ 'name' ]
                    });
        
                    let bi = success[4].filter(item => item.idStatus === EBudgetItemStatus.Technical || item.idStatus === EBudgetItemStatus.Active || item.idStatus === EBudgetItemStatus.Closed);

                    // Скрываем от тех, кто не работает со статьями ФОТ
                    if (!this.baseService.currentUser.hasUserPermission(EUserPermission.FOTRequestsCreate) && !this.baseService.currentUser.hasUserPermission(EUserPermission.FOTResuestsRead)) {
                        bi = bi.filter(item => !item.paymentRequestKinds.includes(EPaymentRequestKind.Staff) || item.code === '30000');
                    }

                    this.dicts.budgetItems = new TreeItemsContainer<BudgetItem>(bi, {
                        filterByFields: [ 'name', 'code' ],
                        orderByFields: [ 'name' ]
                    });

                    this.dicts.currencies = new FlatItemsContainer<Currency>(success[5], {
                        orderByFields: [ 'isoCode' ]
                    });

                    this.dicts.tags = new FlatItemsContainer<AgreementTagModel>(success[6], {
                        orderByFields: ['idAgreementTagType'],
                    });

                    resolvePromise();
                },
                (error) => {
                    rejectPromise(error.message);

                    this.mb.open({
                        title: 'Ошибка',
                        text: error.message,
                        target: MessageBoxTarget.Error
                    }).subscribe();
                }
            );
        });
    }

    refreshData() {
        this.isDataLoading = true;

        return new Promise((resolvePromise, rejectPromise) => {
            this.filters.userIdIndividualPerson = this.baseService.currentUser.individualPerson.id;
            this.filters.userLocalDate = new Date();
            this.filters.sortFields = this.getSortFieldsValue();

            // Отменяем предыдущий запрос
            if (this.subscriptions.refreshDataSubscription) {
                this.subscriptions.refreshDataSubscription.unsubscribe();
                this.subscriptions.refreshDataSubscription = undefined;
            }

            this.subscriptions.refreshDataSubscription = this.agreementService.getAgreementListByFilters(this.filters, this.language.id, this.skip, this.pageSize)
                .subscribe( 
                    (success)  => {

                        const groupedItems = groupBy(success.items, this.gridGroups);

                        this.gridView = {
                            data: groupedItems,
                            total: success.rowsCount
                        };

                        this.isDataLoading = false;

                        resolvePromise();
                    },
                    (error) => {
                        this.isDataLoading = false;
                        rejectPromise();

                        this.mb.open({
                            title: 'Ошибка',
                            text: error.error,
                            target: MessageBoxTarget.Error
                        }).subscribe();
                    }
                );
        });
    }

    // *** УДАЛИЛ ПОХОЖИЙ КОД ***

    onSelectCfoButtonClick() {
        // Открываем модальное окно
        const dialogRef = this.dialogService.open({
            appendTo: this.dialogContainerRef,
            title: this.translate('App.CfoSelection'),
            content: TreeItemSelectorComponent,
            width: 1000,
            height: 640
        });

        const component = dialogRef.content.instance as TreeItemSelectorComponent<Cfo>;

        // Формируем входные данные
        component.dictionary = new TreeItemsContainer(cloneDeep(this.dicts.cfos.sourceItems.filter(item => item.id !== this.ID_ALL)), {
          filterByFields: ['name', 'code'],
          orderByFields: ['isParent', 'name'],
          orderByFieldsDirection: ['desc', 'asc'],
          needIsParentField: true
        });
        component.settings.addCodeToName = true;

        let parents: number[] = [];
        this.filters.idsCfo.forEach(id => {
          parents = parents.concat(this.findParents(this.dicts.cfos.sourceItems, id));
        });
        parents = uniq(parents);

        setTimeout(() => {
          component.checkedKeys = clone(this.filters.idsCfo);
          component.expandedKeys = parents;
        }, 200);

        // Подписываемся на закрытие окна для получения результата
      const subs = dialogRef.result.subscribe((result) => {
        if (component.dialogResult === ModalDialogCloseResult.Ok) {
          this.cfosMultiselect = sortBy(component.checkedKeys.map(item => {
            return this.dicts.cfos.dictItems[item];
          }), 'name');
          this.filters.idsCfo = component.checkedKeys;
          this.filterChanged();
        }
      });
    }

   // *** УДАЛИЛ ПОХОЖИЙ КОД ***

    showSuccessNotification() {
        this.notificationService.show({
            hideAfter: 2000,
            content: this.baseService.getTrn('Agreement.Done'),
            position: { horizontal: 'center', vertical: 'top' },
            animation: { type: 'fade', duration: 300 },
            type: { style: 'success', icon: true },
            closable: false
        });
    }

    showErrorMessage(errorText: string) {
        this.mb.open({
            title: this.baseService.getTrn('App.Error'),
            text: errorText,
            target: MessageBoxTarget.Error
          }).subscribe();
    }

    // Значения, для отобржаения тэгов в ячейке грида
    getCellTagValue(item: AgreementListItem): { name: string, color: AgreementTagColor }[] {
        const agreementTags: { name: string, color: AgreementTagColor}[] = [];
        
        if (item.idAgreementStatus) {
            agreementTags.push({ name: item.statusName, color: this.defineTagColor(AgreementTagType.Status, item.idAgreementStatus) });
        }

        if (item.idAgreementPurchaseType) {
            agreementTags.push({ name: item.purchaseTypeName, color: this.defineTagColor(AgreementTagType.PurchaseType, item.idAgreementPurchaseType) });
        }

        if (item.hasAgreementHold) {
          agreementTags.push({ name: 'hold', color: this.defineTagColor(AgreementTagType.Hold, null) });
        }

        return agreementTags;
    }
}
