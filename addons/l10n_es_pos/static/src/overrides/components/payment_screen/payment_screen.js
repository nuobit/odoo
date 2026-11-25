/** @odoo-module */
import { _t } from "@web/core/l10n/translation";
import {patch} from "@web/core/utils/patch";
import {ErrorPopup} from "@point_of_sale/app/errors/popups/error_popup";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { toRaw } from "@odoo/owl";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        let genericPartner;
        if (this.pos.config.is_spanish && !this.skipAutomaticInvoicing()) {
            order.is_l10n_es_simplified_invoice = order.canBeSimplifiedInvoiced() && !order.to_invoice;
            if (!order.is_l10n_es_simplified_invoice && !order.to_invoice) {
                this.popup.add(ErrorPopup, {
                    title: _t("Error"),
                    body: _t("Order amount is too large for a simplified invoice, use an invoice instead."),
                });
                return false;
            }
            if (order.is_l10n_es_simplified_invoice) {
                if (await this._askForCustomerIfRequired() === false) {
                    return false;
                }
                order.to_invoice = Boolean(this.pos.config.l10n_es_simplified_invoice_journal_id);
                // an order shipped later goes to its customer, whom Odoo asks for
                if (order.to_invoice && !order.getShippingDate() && !order.partner) {
                    genericPartner = this.pos.db.partner_by_id[this.pos.config.simplified_partner_id[0]];
                    order.partner = genericPartner;
                }
            }
        }
        try {
            return await super.validateOrder(...arguments);
        } finally {
            // an order paid online left the point of sale, replaced by the one the server
            // sends: nothing is left to give back, and a write would store it again as unpaid
            const left = !this.pos.get_order_list().some((other) => toRaw(other) === toRaw(order));
            if (order.is_l10n_es_simplified_invoice && !order.finalized && !left) {
                // refused, by a check or by the server (an error)
                order.giveBackSimplifiedInvoice(genericPartner);
            }
        }
    },
    skipAutomaticInvoicing() {
        const order = this.currentOrder;
        if (
            this.pos.config.is_spanish &&
            order.is_settling_account &&
            order.orderlines.length === 0 &&
            !order.to_invoice
        ) {
            return true;
        }
        return false;
    },
    shouldDownloadInvoice() {
        return this.pos.config.is_spanish
            ? !this.pos.selectedOrder.is_l10n_es_simplified_invoice
            : super.shouldDownloadInvoice();
    },
    async _postPushOrderResolve(order, order_server_ids) {
        if (this.pos.config.is_spanish) {
            const savedOrder = await this.orm.searchRead(
                "pos.order",
                [["id", "in", order_server_ids]],
                ["account_move"]
            );
            order.invoice_name = savedOrder[0].account_move[1];
        }
        return super._postPushOrderResolve(...arguments);
    },
});
