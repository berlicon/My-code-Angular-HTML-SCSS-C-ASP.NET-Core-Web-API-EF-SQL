using CostControl.Orm.Models.Agreement;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace CostControl.Orm.Repositories.Implementation
{
    public class AgreementRepository: IAgreementRepository
    {
        private CostControlContext context;

        public AgreementRepository(CostControlContext context)
        {
            this.context = context;
        }

        public void UseDbTransaction(DbConnection connection, IDbContextTransaction transaction)
        {
            if (connection != null)
            {
                var options = new DbContextOptionsBuilder<CostControlContext>()
                                .UseSqlServer(connection)
                                .Options;
                this.context = new CostControlContext(options);
            }

            if (transaction != null)
            {
                this.context.Database.UseTransaction(transaction.GetDbTransaction());
            }
        }

        public async Task<List<AgreementPaymentSchedule>> GetAgreementPaymentSchedule(int idAgreement)
        {
            var result = await this.context.AgreementPaymentSchedule
                .Include(x => x.AgreementAnalytic)
                .Where(x => x.IdAgreement == idAgreement)
                .AsNoTracking()
                .ToListAsync();

            return result;
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***
    }
}
