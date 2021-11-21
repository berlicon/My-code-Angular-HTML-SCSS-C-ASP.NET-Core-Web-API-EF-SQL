using CostControl.Orm;
using CostControl.Web.Attributes;
using CostControl.Core.Enums;
using CostControl.Core.Interfaces;
using CostControl.Core.Models.Agreement;
using CostControl.Core.Models.Dictionary;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CostControl.Web.Controllers.Process
{
    [Produces("application/json")]
    [Route("api/agreements")]
    public class AgreementsController : Controller
    {
        private readonly CostControlContext _context;
        private readonly IAuthService _authService;
        private readonly IAgreementService _agreementService;

        public AgreementsController(CostControlContext context, IAuthService authService, IAgreementService agreementService)
        {
            _context = context;
            _authService = authService;
            _agreementService = agreementService;
        }

        [HttpGet]
        [Route("status/{id}")]
        public async Task<IActionResult> GetAgreementStatus([FromRoute] int id)
        {
            try
            {
                var result = await _agreementService.GetAgreementStatus(id);

                if (result.Success)
                {
                    return Ok(result.Value);
                }
                else
                {
                    return BadRequest(result.Error);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        [HttpPost("list/{idLanguage}/{skip}/{size}")]
        public async Task<IActionResult> GetAgreementListItemsByFilter([FromRoute] int idLanguage, [FromRoute] int? skip, [FromRoute] int? size, [FromBody] AgreementListFilterModel filters)
        {
            try
            {
                var idIndividualPerson = (await _authService.GetUserContext()).IdIndividualPerson;
                var result = await _agreementService.GetAgreementListItemsByFilter(idIndividualPerson, idLanguage, skip, size, filters);

                if (result.Success)
                {
                    return Ok(result.Value);
                }
                else
                {
                    return BadRequest(result.Error);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        [HttpGet]
        [Route("{idAgreement}")]
        public async Task<IActionResult> GetAgreement([FromRoute] int idAgreement)
        {
            try
            {
                var result = await _agreementService.GetAgreement(idAgreement);

                if (result.Success && result.Value == null)
                {
                    return NotFound("Договор не найден.");
                }

                if (result.Failure)
                {
                    return BadRequest(result.Error);
                }

                return Ok(result.Value);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut]
        [PermissionCheckAttribute(new[] { EUserPermission.FC, EUserPermission.FCAdmin, EUserPermission.Procurement })]
        public async Task<IActionResult> UpdateAgreement([FromBody] AgreementModel agreement)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _agreementService.UpdateAgreement(agreement);

                if (result.Failure)
                {
                    return BadRequest(result.Error);
                }

                return Ok(result.Value);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***

        [HttpPost]
        [Route("byFilter")]
        public async Task<IActionResult> GetAgreementsByFilter([FromBody]AgreementFilterModel filter)
        {
            try
            {
                var result = await _agreementService.GetAgreementsByFilter(filter);
                if (result.Success)
                {
                    return Ok(result.Value);
                }
                else
                {
                    return BadRequest(result.Error);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // *** УДАЛИЛ ПОХОЖИЙ КОД ***
    }
}
