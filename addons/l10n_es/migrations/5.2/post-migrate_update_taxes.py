# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.account.models.chart_template import update_taxes_from_templates


def migrate(cr, version):
    pass
    # disabled because not always we want to update the taxes for all companies
    #update_taxes_from_templates(cr, 'l10n_es.account_chart_template_common')
