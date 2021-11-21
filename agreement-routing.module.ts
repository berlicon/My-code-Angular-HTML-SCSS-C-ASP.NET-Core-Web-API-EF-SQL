import { Routes, RouterModule } from '@angular/router';
import { AgreementListComponent } from './lists/agreement-list.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { TranslationModule } from '../shared/pipes/translation/translation.module';
import { HotTableModule } from '@handsontable/angular';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { TreeListModule } from '@progress/kendo-angular-treelist';
import { GridModule, ExcelModule } from '@progress/kendo-angular-grid';
import { TabStripModule, LayoutModule } from '@progress/kendo-angular-layout';
import { DebounceModule } from '../shared/directives/debounce/debounce.module';
import { TreeSelectorModule } from '../shared/components/tree-selector/tree-selector.module';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { NgxUiLoaderModule } from 'ngx-ui-loader';
import { QuickFilterItemComponent } from './lists/components/quick-filter-item/quick-filter-item.component';
import { AgreementTagCellItemComponent } from './lists/components/agreement-tag-cell-item/agreement-tag-cell-item.component';
import { AgreementCardViewCanActivateGuard } from './agreement-card/guards/agreement-card-view-can-activate.guard';
import { AgreementCardEditCanActivateGuard } from './agreement-card/guards/agreement-card-edit-can-activate.guard';
import { AgreementCardComponent } from './agreement-card/agreement-card.component';
import { EAgreementCardType } from './agreement-card/enums/e-agreement-card-type';
import { AgreementViewComponent } from './agreement-card/agreement-view/agreement-view.component';
import { AgreementEditComponent } from './agreement-card/agreement-edit/agreement-edit.component';
import { AgreementViewTitleComponent } from './agreement-card/agreement-view/agreement-view-title/agreement-view-title.component';
import { AgreementViewInfoComponent } from './agreement-card/agreement-view/agreement-view-info/agreement-view-info.component';
import { AgreementRelationComponent } from './agreement-relation/agreement-relation.component';
import { BaseService } from '../shared/services/base.service';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { AgreementSelectorNewModule } from '../shared/components/agreement-selector-new/agreement-selector-new.module';
import { PopupModule } from '@progress/kendo-angular-popup';
import { TreeViewMulticolumnModule } from '../shared/components/tree-view-multicolumn/tree-view-multicolumn.module';
import { TotalSumModule } from '../shared/components/total-sum/total-sum.module';
import { AgreementCardEditCanDeactivateGuard } from './agreement-card/guards/agreement-card-edit-can-deactivate.guard';
import { AgreementEditPaymentScheduleModule } from './agreement-card/agreement-edit/agreement-edit-payment-schedule/agreement-edit-payment-schedule.module';
import { UrlSafeModule } from '../shared/pipes/url-safe/url-safe.module';

const appRoutes: Routes = [
    {
        path: 'list/:mode',
        component: AgreementListComponent,
        canActivate: [ AgreementCardViewCanActivateGuard ],
        runGuardsAndResolvers: 'always'
    },
    {
        path: 'view/:id',
        component: AgreementCardComponent,
        data: { mode: EAgreementCardType.View },
        canActivate: [ AgreementCardViewCanActivateGuard ],
        runGuardsAndResolvers: 'always'
    },
    {
        path: 'edit/:id',
        component: AgreementCardComponent,
        data: { mode: EAgreementCardType.Edit },
        canActivate: [ AgreementCardEditCanActivateGuard ],
        canDeactivate: [ AgreementCardEditCanDeactivateGuard ],
        runGuardsAndResolvers: 'always'
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(appRoutes),
        TranslationModule,
        ButtonsModule,
        DropDownsModule,
        DebounceModule,
        InputsModule,
        TreeListModule,
        DateInputsModule,
        TreeSelectorModule,
        GridModule,
        TooltipModule,
        ExcelModule,
        TabStripModule,
        HotTableModule.forRoot(),
        LayoutModule,
        NgxUiLoaderModule,
        AgreementSelectorNewModule,
        DialogModule,
        PopupModule,
        TreeViewMulticolumnModule,
        TotalSumModule,
        AgreementEditPaymentScheduleModule,
        UrlSafeModule,
    ],
    declarations: [
        AgreementListComponent,
        QuickFilterItemComponent,
        AgreementTagCellItemComponent,
        AgreementRelationComponent,
        AgreementCardComponent,
        AgreementViewComponent,
        AgreementEditComponent,
        AgreementViewTitleComponent,
        AgreementViewInfoComponent,
		// *** УДАЛИЛ ПОХОЖИЙ КОД ***
    ],
    providers: [
        AgreementCardViewCanActivateGuard,
        AgreementCardEditCanActivateGuard,
        AgreementCardEditCanDeactivateGuard,
        BaseService
    ],
    exports: [
        RouterModule
    ]
})

export class AgreementRoutingModule { }
