using AutoMapper;
using CostControl.Core.Enums;
using CostControl.Core.Extensions;
using CostControl.Core.Handlers;
using CostControl.Core.Helpers;
using CostControl.Core.Interfaces;
using CostControl.Core.Models.Agreement;
using CostControl.Core.Models.Dictionary;
using CostControl.Core.Models.Reports;
using CostControl.Orm;
using CostControl.Orm.Models.Agreement;
using CostControl.Orm.Models.Dictionary;
using CostControl.Orm.Models.Preferences;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.SqlServer.Server;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Data.SqlTypes;
using System.Linq;
using System.Threading.Tasks;

namespace CostControl.Core.Services
{
    public class AgreementService : IAgreementService
    {
        private readonly IAuthService _authService;
        private readonly INotificationService _notificationService;
        private readonly CostControlContext _context;
        private readonly IPaymentRequestCommentsService _commentsService;
        private readonly ILocalizationService _localizationService;
        private readonly IMediator _mediator;

        public AgreementService(CostControlContext context, IAuthService authService, INotificationService notificationService,
            IPaymentRequestCommentsService commentsService, ILocalizationService localizationService, IMediator mediator)
        {
            _context = context;
            _authService = authService;
            _notificationService = notificationService;
            _commentsService = commentsService;
            _localizationService = localizationService;
            _mediator = mediator;
        }

        /// <summary>
        /// Получаем статус договора
        /// </summary>
        /// <param name="idAgreement">Id договора</param>
        /// <returns>Id статуса договора</returns>
        public async Task<Result<int?>> GetAgreementStatus(int idAgreement)
        {
            try
            {
                var idAgreementStatus = await (from p in _context.Agreements
                                               where p.IdAgreement == idAgreement
                                               select p.IdAgreementStatus).FirstOrDefaultAsync();

                return Result.Ok(idAgreementStatus);
            }
            catch (Exception ex)
            {
                return Result.Fail<int?>(ex.ToString());
            }
        }

        public async Task<Result<AgreementListColumnsModel[]>> GetAgreementListColumns(int userIdIndividualPerson)
        {
            try
            {
                var userIdIndividualPersonParameter = new SqlParameter("@User_Id_Individual_Person", userIdIndividualPerson);
                var result = await _context.AgreementListColumns.FromSql(
                    string.Format("exec {0} {1}", StoredProcedures.AGR_SP_GET_AGREEMENT_LIST_COLUMNS, "@User_Id_Individual_Person"),
                    userIdIndividualPersonParameter
                    ).ToListAsync();

                return Result.Ok(result.Select(_ => Mapper.Map<AgreementListColumns, AgreementListColumnsModel>(_)).ToArray());

            }
            catch (Exception ex)
            {
                return Result.Fail<AgreementListColumnsModel[]>(ex.Message);
            }
        }

		// *** УДАЛИЛ ПОХОЖИЕ МЕТОДЫ ***

        public async Task<Result<AgreementModel>> GetAgreement(int idAgreement)
        {
            try
            {
                var context = await _authService.GetUserContext();
                var idLanguage = context.IdLanguage;

                var result = await _context
                    .AgreementsTranslation
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.IdAgreement == idAgreement && x.IdLanguage == idLanguage);

                // ПК договора
                var paymentSchedule = await _context.AgreementPaymentSchedule
                    .Include(x => x.AgreementAnalytic)
                    .Where(x => x.IdAgreement == idAgreement)
                    .Select(x => Mapper.Map<AgreementPaymentScheduleModel>(x))
                    .OrderBy(x => x.PaymentDate)
                    .ToArrayAsync();

                // Заявки по договору
                AgreementPaymentHistoryModel[] paymentHistories;
                var paymentRequestByAgreement = await _context.PaymentRequest
                    .Where(x => x.IdAgreement == idAgreement)
                    .Include(x => x.Currency)
                    .Include(x => x.PaymentCurrency)
                    .Include(x => x.PaymentRequestStatus).ThenInclude(x => x.PaymentRequestStatusTranslation)
                    .Include(x => x.CreatedByPerson).ThenInclude(x => x.IndividualPersonTranslation)
                    .OrderByDescending(x => x.EndDateFact)
                    .ThenByDescending(x => x.IdPaymentRequest)
                    .ToArrayAsync();
                if (paymentRequestByAgreement != null)
                {
                    var comments = await _commentsService.GetComments(paymentRequestByAgreement.Select(x => x.IdPaymentRequest), idLanguage);

                    paymentHistories = paymentRequestByAgreement.Select((el, index) => new AgreementPaymentHistoryModel
                    {
                        IdPaymentRequest = el.IdPaymentRequest,
                        IdStatus = el.IdPaymentRequestStatus,
                        StatusName = Helper.GetTranslateOrDefault(el.PaymentRequestStatus, x => x.PaymentRequestStatusTranslation, x => x.IdLanguage == idLanguage, x => x.Name, x => x.Name),
                        Amount = el.AccountAmount,
                        AccountCurrencyName = Helper.GetFieldOrDefault(el.Currency, x => x.IsoCode),
                        PaymentCurrencyName = Helper.GetFieldOrDefault(el.PaymentCurrency, x => x.IsoCode),
                        RequestDate = el.CreatedAt,
                        PaymentDatePlan = el.PaymentDate,
                        PaymentDateFact = el.EndDateFact,
                        Initiator = Helper.GetTranslateOrDefault(el.CreatedByPerson, x => x.IndividualPersonTranslation, x => x.IdLanguage == idLanguage, x => x.Name, x => x.Name),
                        Comments = comments.ContainsKey(el.IdPaymentRequest) ? comments[el.IdPaymentRequest] : new Models.Payment.Comments.PaymentRequestComment[0]
                    }).ToArray();
                }
                else
                {
                    paymentHistories = new AgreementPaymentHistoryModel[0];
                }

                var mapResult = Mapper.Map<Agreement_v, AgreementModel>(result, opt => opt.AfterMap((src, dest) =>
                {
                    dest.PaymentHistories = paymentHistories;
                    dest.PaymentSchedules = paymentSchedule;
                }));

                return Result.Ok(mapResult);
            }
            catch (Exception ex)
            {
                return Result.Fail<AgreementModel>(ex.Message);
            }
        }

        public async Task<Result<int>> UpdateAgreement(AgreementModel agreement)
        {
            try
            {
                var dbEntity = await _context.Agreements
                    .Include(x => x.PaymentSchedules)
                        .ThenInclude(x => x.AgreementAnalytic).ThenInclude(x => x.AgreementBudgetSource).ThenInclude(x => x.PaymentRequestBudgetSourceStatus)
                    .FirstOrDefaultAsync(x => x.IdAgreement == agreement.IdAgreement);

                var dbSource = dbEntity.PaymentSchedules.Select(x => x.AgreementAnalytic).SelectMany(x => x.AgreementBudgetSource).Where(x => x.PaymentRequestBudgetSourceStatus.IsInProcess).ToList();

                if (dbEntity == null)
                {
                    return Result.Fail<int>("Договор не найден!");
                }

                if (dbSource.Count() > 0 && dbEntity.IdCurrency != agreement.IdCurrency)
                {
                    return Result.Fail<int>("Изменение валюты не допустимо, для договора с подобранными источниками!");
                }

                var userContext = await _authService.GetUserContext();
                var userId = userContext.IdIndividualPerson;
                var now = DateTime.UtcNow;

                dbEntity.IdAgreementType = agreement.IdAgreementType;
                dbEntity.IdCurrency = agreement.IdCurrency;
                dbEntity.IdPaymentRequestBasisOn = agreement.IdPaymentRequestBasisOn;
                dbEntity.IdProcurementBasisOn = agreement.IdProcurementBasisOn;
                dbEntity.BasisOnBC = agreement.BasisOnBC;
                dbEntity.BasisOnBCYear = agreement.BasisOnBCYear;
                dbEntity.AgreementSZLink = agreement.AgreementSZLink;
                dbEntity.AgreementPCSZLink = agreement.AgreementPCSZLink;
                dbEntity.CommentFC = agreement.CommentFC;
                dbEntity.IdAgreementPurchaseType = agreement.IdAgreementPurchaseType;
                dbEntity.BasisOnTCMonthsCount = agreement.BasisOnTCMonthsCount;
                dbEntity.BasisOnTC = agreement.BasisOnTC;
                dbEntity.BasisOnTCDate = agreement.BasisOnTCDate;
                dbEntity.BasisOnTCStartDate = agreement.BasisOnTCStartDate;
                dbEntity.AgreementJiraLink = agreement.AgreementJiraLink;
                dbEntity.CommentTender = agreement.CommentTender;
                dbEntity.ModifiedAt = now;
                dbEntity.ModifiedBy = userId;

                List<AgreementPaymentSchedule> removePS = new List<AgreementPaymentSchedule>();
                List<AgreementPaymentSchedule> addPS = new List<AgreementPaymentSchedule>();
                List<AgreementPaymentSchedule> updatePS = new List<AgreementPaymentSchedule>();

                // С фронта пришёл пустой ПК, удалить все строки из БД
                if (agreement.PaymentSchedules == null || agreement.PaymentSchedules.Count == 0)
                {
                    removePS.AddRange(dbEntity.PaymentSchedules);
                }
                else
                {
                    // 1. Удалить строки которые есть в БД, но нет на фронте
                    foreach (var paymentSchedule in dbEntity.PaymentSchedules)
                    {
                        if (!agreement.PaymentSchedules.Any(x => x.Id == paymentSchedule.Id))
                        {
                            removePS.Add(paymentSchedule);
                        }
                    }

                    // Новые аналитики, которые необходимо добавить
                    List<AgreementAnalytic> newAnalytics = new List<AgreementAnalytic>();
                    foreach (var paymentSchedule in agreement.PaymentSchedules)
                    {
                        var budgetPeriod = await _context.BudgetPeriod.FirstOrDefaultAsync(x => paymentSchedule.PaymentDate >= x.BudgetPeriodBegin && paymentSchedule.PaymentDate <= x.BudgetPeriodEnd);
                        if (budgetPeriod == null)
                        {
                            return Result.Fail<int>($"Бюджетный период, для даты {paymentSchedule.PaymentDate.ToString("dd.MM.yyyy")} не найден");
                        }

                        var dbPaymentScheduleEntity = dbEntity.PaymentSchedules.FirstOrDefault(x => x.Id == paymentSchedule.Id);

                        // Поиск аналитики договора
                        var dbAgreementAnalyticEntity = await _context.AgreementAnalytics.FirstOrDefaultAsync(x =>
                            x.IdCfo == paymentSchedule.IdCfo &&
                            x.IdCfoCustomer == paymentSchedule.IdCfoCustomer &&
                            x.IdCapitalFacility == paymentSchedule.IdCapitalFacility &&
                            x.IdBudgetItem == paymentSchedule.IdBudgetItem &&
                            x.IdAgreement == agreement.IdAgreement &&
                            x.IdBudgetItemAnalytic == paymentSchedule.IdBudgetItemAnalytic &&
                            x.IdBudgetPeriod == budgetPeriod.Id &&
                            x.IdEvent == paymentSchedule.IdEvent
                        );
                        // Поиск новых аналитик, которые создаём в рамках транзакции
                        if (dbAgreementAnalyticEntity == null && newAnalytics.Count > 0)
                        {
                            dbAgreementAnalyticEntity = newAnalytics.FirstOrDefault(x =>
                            x.IdCfo == paymentSchedule.IdCfo &&
                            x.IdCfoCustomer == paymentSchedule.IdCfoCustomer &&
                            x.IdCapitalFacility == paymentSchedule.IdCapitalFacility &&
                            x.IdBudgetItem == paymentSchedule.IdBudgetItem &&
                            x.IdAgreement == agreement.IdAgreement &&
                            x.IdBudgetItemAnalytic == paymentSchedule.IdBudgetItemAnalytic &&
                            x.IdBudgetPeriod == budgetPeriod.Id &&
                            x.IdEvent == paymentSchedule.IdEvent
                            );
                        }

                        // 2. Добавить новые строки ПК в БД
                        if (dbPaymentScheduleEntity == null)
                        {
                            dbPaymentScheduleEntity = Mapper.Map<AgreementPaymentSchedule>(paymentSchedule);
                            dbPaymentScheduleEntity.IdAgreement = dbEntity.IdAgreement;
                            dbPaymentScheduleEntity.CreatedAt = now;
                            dbPaymentScheduleEntity.CreatedBy = userId;
                            addPS.Add(dbPaymentScheduleEntity);
                        }
                        // 3. Обновить строки ПК в БД
                        else
                        {
                            Mapper.Map(paymentSchedule, dbPaymentScheduleEntity);
                            updatePS.Add(dbPaymentScheduleEntity);
                        }

                        // Добавление новой аналитики договора
                        if (dbAgreementAnalyticEntity == null)
                        {
                            dbAgreementAnalyticEntity = new AgreementAnalytic()
                            {
                                IdCfo = paymentSchedule.IdCfo,
                                IdCfoCustomer = paymentSchedule.IdCfoCustomer,
                                IdBudgetItem = paymentSchedule.IdBudgetItem,
                                IdAgreement = agreement.IdAgreement,
                                IdBudgetItemAnalytic = paymentSchedule.IdBudgetItemAnalytic,
                                IdBudgetPeriod = budgetPeriod.Id,
                                IdEvent = paymentSchedule.IdEvent,
                                IdCapitalFacility = paymentSchedule.IdCapitalFacility,
                                CreatedAt = now,
                                CreatedBy = userId
                            };

                            var newAnalytic = await _context.AgreementAnalytics.AddAsync(dbAgreementAnalyticEntity);
                            newAnalytics.Add(newAnalytic.Entity);
                        }

                        dbPaymentScheduleEntity.ModifiedAt = now;
                        dbPaymentScheduleEntity.ModifiedBy = userId;
                        dbPaymentScheduleEntity.IdAgreementAnalytic = dbAgreementAnalyticEntity.Id;
                    }
                }

                _context.Agreements.Update(dbEntity);

                _context.AgreementPaymentSchedule.RemoveRange(removePS);
                _context.AgreementPaymentSchedule.UpdateRange(updatePS);
                await _context.AgreementPaymentSchedule.AddRangeAsync(addPS);
                await Task.Run(() => CheckPaymentScheduleSource(_context.ChangeTracker.Entries<AgreementPaymentSchedule>(), dbSource));

                await _context.SaveChangesAsync();

                return Result.Ok(dbEntity.IdAgreement);
            }
            catch (Exception ex)
            {
                return Result.Fail<int>(ex.Message);
            }
        }

        // *** УДАЛИЛ ПОХОЖИЕ МЕТОДЫ ***

        public async Task<Result<AgreementListResultModel>> GetAgreementListItemsByFilter(
            int userIdIndividualPerson, int idLanguage, int? skip, int? size, AgreementListFilterModel filters)
        {
            if (filters.Date < SqlDateTime.MinValue.Value) { filters.Date = null; }

            var idAgreementParam = new SqlParameter("@Id_Agreement", SqlDbType.Int) { Value = filters.IdAgreement }.WithDbNullCorrection();
            var isHoldingParam = new SqlParameter("@Is_Holding", SqlDbType.Bit) { Value = filters.IsHolding }.WithDbNullCorrection();
            var side2AgreementNumberParam = new SqlParameter("@Side2_Agreement_Number", SqlDbType.NVarChar) { Value = filters.Side2AgreementNumber }.WithDbNullCorrection();
            var idInternalParam = new SqlParameter("@Id_Internal", SqlDbType.Int) { Value = filters.IdInternal }.WithDbNullCorrection();
            var nameParam = new SqlParameter("@Name", SqlDbType.NVarChar) { Value = filters.Name }.WithDbNullCorrection();
            var dateParam = new SqlParameter("@Date", SqlDbType.Date) { Value = filters.Date }.WithDbNullCorrection();
            var amountFromParam = new SqlParameter("@Amount_From", SqlDbType.Decimal) { Value = filters.AmountFrom }.WithDbNullCorrection();
            var amountToParam = new SqlParameter("@Amount_To", SqlDbType.Decimal) { Value = filters.AmountTo }.WithDbNullCorrection();

            // Статусы
            var idAgremeentStatusValues = new List<SqlDataRecord>();
            foreach (var item in filters.IdsAgreementStatus)
            {
                var idAgremeentStatusValue = new SqlDataRecord(
                    new SqlMetaData("Value", SqlDbType.Int)
                );

                idAgremeentStatusValue.SetValues(item);
                idAgremeentStatusValues.Add(idAgremeentStatusValue);
            }
            var idAgreementStatusParam = new SqlParameter("@Id_Agreement_Status", SqlDbType.Structured)
            {
                Direction = ParameterDirection.Input,
                TypeName = "dbo.type_Int_Values",
                Value = idAgremeentStatusValues.Count > 0 ? idAgremeentStatusValues : null
            };

            // Статьи
            var idBudgetItemsValues = new List<SqlDataRecord>();
            foreach (var item in filters.IdsBudgetItem)
            {
                var idBudgetItemsValue = new SqlDataRecord(
                    new SqlMetaData("Value", SqlDbType.Int)
                );

                idBudgetItemsValue.SetValues(item);
                idBudgetItemsValues.Add(idBudgetItemsValue);
            }
            var idBudgetItemsParam = new SqlParameter("@Id_Budget_Item", SqlDbType.Structured)
            {
                Direction = ParameterDirection.Input,
                TypeName = "dbo.type_Int_Values",
                Value = idBudgetItemsValues.Count > 0 ? idBudgetItemsValues : null
            };

            // ЦФО
            var idCfoValues = new List<SqlDataRecord>();
            foreach (var item in filters.IdsCfo)
            {
                var idCfoValue = new SqlDataRecord(
                    new SqlMetaData("Value", SqlDbType.Int)
                );

                idCfoValue.SetValues(item);
                idCfoValues.Add(idCfoValue);
            }
            var idCfoParam = new SqlParameter("@Id_Cfo", SqlDbType.Structured)
            {
                Direction = ParameterDirection.Input,
                TypeName = "dbo.type_Int_Values",
                Value = idCfoValues.Count > 0 ? idCfoValues : null
            };

            // ЮЛ
            var idLegacyValues = new List<SqlDataRecord>();
            foreach (var item in filters.IdsLegacy)
            {
                var idLegacyValue = new SqlDataRecord(
                    new SqlMetaData("Value", SqlDbType.Int)
                );

                idLegacyValue.SetValues(item);
                idLegacyValues.Add(idLegacyValue);
            }
            var idLegacyParam = new SqlParameter("@Id_Legacy", SqlDbType.Structured)
            {
                Direction = ParameterDirection.Input,
                TypeName = "dbo.type_Int_Values",
                Value = idLegacyValues.Count > 0 ? idLegacyValues : null
            };

            // Тэги
            var idTagValues = new List<SqlDataRecord>();
            foreach (var item in filters.Tags)
            {
                var idLegacyValue = new SqlDataRecord(
                    new SqlMetaData("Value1", SqlDbType.Int),
                    new SqlMetaData("Value2", SqlDbType.Int)
                );

                idLegacyValue.SetValue(0, item.IdAgreementTagType);
                idLegacyValue.SetValue(1, item.IdTag);
                idTagValues.Add(idLegacyValue);
            }
            var idTagParam = new SqlParameter("@Id_Tag", SqlDbType.Structured)
            {
                Direction = ParameterDirection.Input,
                TypeName = "dbo.type_Int_Int_Values",
                Value = idTagValues.Count > 0 ? idTagValues : null
            };

            var idLanguageParam = new SqlParameter("@Id_Language", SqlDbType.Int) { Value = idLanguage };
            var userLocalDateParam = new SqlParameter("@User_Local_Date", SqlDbType.DateTime) { Value = filters.UserLocalDate };
            var userIdIndividualPersonParam = new SqlParameter("@User_Id_Individual_Person", SqlDbType.Int) { Value = userIdIndividualPerson };

            var quickFilterParam = new SqlParameter("@Quick_Filter", SqlDbType.NVarChar) { Value = filters.QuickFilter }.WithDbNullCorrection();
            var contractorNameParam = new SqlParameter("@Contractor_Name", SqlDbType.NVarChar) { Value = filters.ContractorName }.WithDbNullCorrection();
            var signerNameParam = new SqlParameter("@Signer_Name", SqlDbType.NVarChar) { Value = filters.SignerName }.WithDbNullCorrection();
            var basisBCNumberParam = new SqlParameter("@Basis_BC_Number", SqlDbType.NVarChar) { Value = filters.BasisBCNumber }.WithDbNullCorrection();
            var basisTCNumberParam = new SqlParameter("@Basis_TC_Number", SqlDbType.NVarChar) { Value = filters.BasisTCNumber }.WithDbNullCorrection();
            var idCurrencyParam = new SqlParameter("@Id_Currency", SqlDbType.Int) { Value = filters.IdCurrency }.WithDbNullCorrection();

            var sizeRowsParam = new SqlParameter("@Size_Rows", SqlDbType.Int) { Value = size }.WithDbNullCorrection();
            var skipRowsParam = new SqlParameter("@Skip_Rows", SqlDbType.Int) { Value = skip }.WithDbNullCorrection();
            var sortFieldsParam = new SqlParameter("@Sort_Fields", SqlDbType.NVarChar) { Value = filters.SortFields }.WithDbNullCorrection();

            var isInWorkParam = new SqlParameter("@isInWork", SqlDbType.Bit) { Value = filters.IsInWork };

            var result = await _context.AgreementListItems.FromSql(
                "agr.sp_Get_Agreement_List @Id_Agreement, @Is_Holding, @Side2_Agreement_Number, @Id_Internal, @Name, @Date, @Amount_From, @Amount_To, @Id_Agreement_Status, @Id_Cfo, @Id_Budget_Item, @Id_Legacy, @Id_Tag, @Quick_Filter, @Contractor_Name, @Signer_Name, @Basis_BC_Number, @Basis_TC_Number, @Id_Currency, @Id_Language, @User_Local_Date, @User_Id_Individual_Person, @Size_Rows, @Skip_Rows, @Sort_Fields, @isInWork",
                idAgreementParam,
                isHoldingParam,
                side2AgreementNumberParam,
                idInternalParam,
                nameParam,
                dateParam,
                amountFromParam,
                amountToParam,
                idAgreementStatusParam,
                idCfoParam,
                idBudgetItemsParam,
                idLegacyParam,
                idTagParam,
                quickFilterParam,
                contractorNameParam,
                signerNameParam,
                basisBCNumberParam,
                basisTCNumberParam,
                idCurrencyParam,
                idLanguageParam,
                userLocalDateParam,
                userIdIndividualPersonParam,
                sizeRowsParam,
                skipRowsParam,
                sortFieldsParam,
                isInWorkParam
            )
            .ToListAsync();

            var firstValue = result.FirstOrDefault();

            return Result.Ok(
                new AgreementListResultModel()
                {
                    Items = result,
                    RowsCount = firstValue != null ? firstValue.RowsCount : 0
                }
            );
        }

        public async Task<ReportFileModel> ExportAgreementList(int userIdIndividualPerson, int idLanguage, AgreementListFilterModel filters)
        {
            var translations = await this._localizationService.GetUITranslations(idLanguage);
            var columnsResult = await this.GetAgreementListColumns(userIdIndividualPerson);
            var itemsResult = await this.GetAgreementListItemsByFilter(
                userIdIndividualPerson, idLanguage, null, null, filters);

            var items = (itemsResult?.Value?.Items ?? new List<AgreementListItem>())
                .Cast<object>()
                .ToArray();

            var translationDictionary = translations.ToDictionary(t => t.Key);

            var columns = (columnsResult?.Value ?? new AgreementListColumnsModel[0])
                .Select(column => new ColumnDescriptionModel()
                {
                    Field = column.FieldName,
                    Title = translationDictionary.TryGetValue(column.TranslationName, out var translation) ?
                        translation.Text : column.TranslationName,
                    Width = column.Width,
                    Hidden = !column.IsExportToExcel,
                })
                .ToList();

            var request = new CreateExcelFileRequest()
            {
                Columns = columns,
                Data = items,
                DataType = typeof(AgreementListItem),
                FileName = "List",
            };

            var file = await this._mediator.Send(request);
            return file;
        }
    }
}
