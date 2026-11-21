/** @odoo-module */
import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    canBeSimplifiedInvoiced() {
        return (
            this.pos.config.is_spanish &&
            this.env.utils.roundCurrency(this.get_total_with_tax()) <
                this.pos.config.l10n_es_simplified_invoice_limit
        );
    },
    wait_for_push_order() {
        return this.pos.config.is_spanish ? true : super.wait_for_push_order(...arguments);
    },
    // An order that is not validated keeps neither the to_invoice nor the partner that a
    // simplified invoice was given: they were not the cashier's. `partner` is the one given
    giveBackSimplifiedInvoice(partner) {
        this.to_invoice = false;
        this.is_l10n_es_simplified_invoice = false;
        if (partner && this.partner === partner) {
            this.partner = null;
        }
    },
    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        if (this.pos.config.is_spanish) {
            this.is_l10n_es_simplified_invoice = json.is_l10n_es_simplified_invoice;
            this.invoice_name = json.invoice_name;
            if (
                this.is_l10n_es_simplified_invoice &&
                !["paid", "done", "invoiced"].includes(json.state)
            ) {
                // a validation cut short (a reload while it waited)
                this.giveBackSimplifiedInvoice(
                    this.pos.db.partner_by_id[this.pos.config.simplified_partner_id?.[0]]
                );
            }
        }
    },
    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        if (this.pos.config.is_spanish) {
            json.is_l10n_es_simplified_invoice = this.is_l10n_es_simplified_invoice;
        }
        return json;
    },
});
