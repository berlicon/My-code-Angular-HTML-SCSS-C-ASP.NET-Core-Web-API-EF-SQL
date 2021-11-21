using CostControl.Orm.Models.Dictionary;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CostControl.Orm.Models.Agreement
{
    [Table("Agreement", Schema = "agr")]
    public class Agreement
    {
        [Key]
        [Column("Id_Agreement")]
        public int IdAgreement { get; set; }

        [Column("Id_Contractor_Agreement")]
        public int? IdContractorAgreement { get; set; }

        [Column("Name")]
        public string Name { get; set; }

        [Column("Date")]
        public DateTime? Date { get; set; }

        [Column("Amount")]
        public decimal? Amount { get; set; }

        [Column("Region_Name")]
        public string RegionName { get; set; }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        [ForeignKey(nameof(IdCfo))]
        public virtual Cfo Cfo { get; set; }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        public ICollection<AgreementPaymentSchedule> PaymentSchedules { get; set; }
    }
}
