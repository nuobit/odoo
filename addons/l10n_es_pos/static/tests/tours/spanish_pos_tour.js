/** @odoo-module */

import * as ErrorPopup from "@point_of_sale/../tests/tours/helpers/ErrorPopupTourMethods";
import * as ProductScreen from "@point_of_sale/../tests/tours/helpers/ProductScreenTourMethods";
import * as ReceiptScreen from "@point_of_sale/../tests/tours/helpers/ReceiptScreenTourMethods";
import * as PaymentScreen from "@point_of_sale/../tests/tours/helpers/PaymentScreenTourMethods";
import * as PartnerListScreen from "@point_of_sale/../tests/tours/helpers/PartnerListScreenTourMethods";
import * as Chrome from "@point_of_sale/../tests/tours/helpers/ChromeTourMethods";
import * as TicketScreen from "@point_of_sale/../tests/tours/helpers/TicketScreenTourMethods";
import * as Utils from "@point_of_sale/../tests/tours/helpers/utils";
import { registry } from "@web/core/registry";
import { checkSimplifiedInvoiceNumber, pay } from "./helpers/receipt_helpers";

const SIMPLIFIED_INVOICE_LIMIT = 1000;

registry.category("web_tour.tours").add("spanish_pos_tour", {
    test: true,
    steps: () => [
        ...ProductScreen.confirmOpeningPopup(),

        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...pay(),
        ...checkSimplifiedInvoiceNumber("0001"),
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1", SIMPLIFIED_INVOICE_LIMIT - 1),
        ...pay(),
        ...checkSimplifiedInvoiceNumber("0002"),
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1", SIMPLIFIED_INVOICE_LIMIT + 1),
        ...pay(),
        ...ErrorPopup.isShown(),
        ...ErrorPopup.clickConfirm(),

        ...PaymentScreen.clickInvoiceButton(),
        ...PaymentScreen.clickValidate(),
        {
            content: "verify that the pos requires the selection of a partner",
            trigger: `div.popup.popup-confirm .modal-header:contains('Please select the Customer') ~ footer div.button.confirm`,
        },

        ...PartnerListScreen.clickPartner(""),

        ...PaymentScreen.isInvoiceOptionSelected(),
        ...PaymentScreen.clickValidate(),
        {
            content:
                "verify that the simplified invoice number does not appear on the receipt, because this order is invoiced, so it does not have a simplified invoice number",
            trigger: ".receipt-screen:not(:has(.simplified-invoice-number))",
            isCheck: true,
        },
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...pay(),
        ...checkSimplifiedInvoiceNumber("0003"),

        ...ReceiptScreen.clickNextOrder(),
        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...ProductScreen.clickPayButton(),
        ...PaymentScreen.clickPaymentMethod("Customer Account"),
        ...PaymentScreen.clickValidate(),
        {
            content: "verify that the pos requires the selection of a partner",
            trigger: `div.popup.popup-confirm .modal-header:contains('Customer Required')`,
        },
        ...Chrome.confirmPopup(),
        ...PartnerListScreen.clickPartner("Partner Full"),
        ...PaymentScreen.clickValidate(),
        ...checkSimplifiedInvoiceNumber("0004"),
        {
            content: "the simplified invoice is for the customer picked",
            trigger: ".receipt-screen .pos-receipt-contact:contains('Customer: Partner Full')",
            isCheck: true,
        },
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...ProductScreen.clickPayButton(),
        ...PaymentScreen.clickPaymentMethod("Customer Account"),
        ...PaymentScreen.clickValidate(),
        ...Chrome.confirmPopup(),
        ...PartnerListScreen.clickPartner(""),
        ...PaymentScreen.clickInvoiceButton(),
        ...PaymentScreen.isInvoiceOptionSelected(),
        ...PaymentScreen.clickValidate(),
        {
            content: "the receipt is shown",
            trigger: ".receipt-screen .pos-receipt-contact",
            isCheck: true,
        },
        {
            content: "an invoice asked for after a refused simplified invoice is a full invoice",
            trigger: ".receipt-screen:not(:has(.simplified-invoice-number))",
            isCheck: true,
        },
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...ProductScreen.clickPayButton(),
        {
            content: "an order that left the point of sale (paid online) is left as it is",
            trigger: ".payment-screen",
            run: () => {
                window.l10nEsPosGetOrderList = posmodel.get_order_list;
                posmodel.get_order_list = () => [];
            },
        },
        {
            content: "validate before choosing a payment method",
            trigger: ".payment-screen .button.next.validation",
            mobile: false,
        },
        {
            content: "the validation is refused: no payment method yet",
            trigger: ".o_notification:contains('Select a payment method')",
            isCheck: true,
        },
        {
            content: "it kept what the simplified invoice was given",
            trigger: ".payment-screen",
            run: () => {
                posmodel.get_order_list = window.l10nEsPosGetOrderList;
                const order = posmodel.get_order();
                if (!order.to_invoice) {
                    throw new Error("the to_invoice of an order that left was given back");
                }
                order.giveBackSimplifiedInvoice(order.partner);
            },
        },
        {
            content: "validate again before choosing a payment method",
            trigger: ".payment-screen .button.next.validation",
            mobile: false,
        },
        {
            content: "the validation is refused again: no payment method yet",
            trigger: ".o_notification:contains('Select a payment method')",
            isCheck: true,
        },
        ...PaymentScreen.clickPaymentMethod("Bank"),
        ...PaymentScreen.clickValidate(),
        ...checkSimplifiedInvoiceNumber("0005"),
        {
            content: "a validation that went through keeps the invoice: the receipt can be sent with it",
            trigger: ".receipt-screen .send-email input[placeholder*='the invoice']",
            isCheck: true,
        },
        ...ReceiptScreen.clickNextOrder(),

        ...ProductScreen.addOrderline("Desk Pad", "1"),
        ...ProductScreen.clickPayButton(),
        ...PaymentScreen.clickPaymentMethod("Bank"),
        {
            content: "the server will refuse the order once",
            trigger: ".payment-screen",
            run: () => {
                const saveToServer = posmodel._save_to_server;
                posmodel._save_to_server = () => {
                    posmodel._save_to_server = saveToServer;
                    // not an Error, whose traceback the browser would log as a failure
                    return Promise.reject({ name: "Refused", message: "refused by the server" });
                };
                window.addEventListener("unhandledrejection", (ev) => ev.preventDefault(), {
                    once: true,
                });
            },
        },
        ...PaymentScreen.clickValidate(),
        {
            content: "the server refused the order",
            trigger: ".popup-error .modal-title:contains('refused by the server')",
            isCheck: true,
        },
        {
            content: "close the error",
            trigger: ".popup-error .footer .button.cancel",
        },
        ...PaymentScreen.clickValidate(),
        ...checkSimplifiedInvoiceNumber("0006"),
        ...ReceiptScreen.clickNextOrder(),

        {
            content: "an order read back with a validation cut short by a reload gives it back",
            trigger: ".product-screen",
            run: () => {
                const order = posmodel.get_order();
                order.is_l10n_es_simplified_invoice = true;
                order.to_invoice = true;
                order.partner = posmodel.db.partner_by_id[posmodel.config.simplified_partner_id[0]];
                const readBack = posmodel.createReactiveOrder(order.export_as_JSON());
                if (
                    readBack.to_invoice ||
                    readBack.is_l10n_es_simplified_invoice ||
                    readBack.partner
                ) {
                    throw new Error("the simplified invoice was not given back");
                }
                order.partner = Object.values(posmodel.db.partner_by_id).find(
                    (partner) => partner.name === "Partner Full"
                );
                const withCustomer = posmodel.createReactiveOrder(order.export_as_JSON());
                if (withCustomer.partner?.id !== order.partner.id) {
                    throw new Error("the customer picked was given back too");
                }
                order.is_l10n_es_simplified_invoice = false;
                order.to_invoice = false;
                order.partner = null;
            },
        },
        ...Chrome.clickMenuButton(),
        ...Chrome.clickTicketButton(),
        ...TicketScreen.selectFilter("Paid"),
        ...TicketScreen.selectOrder("-0001"),
        ...TicketScreen.clickControlButton("Print Receipt"),
        ...checkSimplifiedInvoiceNumber("0001"),
    ],
});

registry.category("web_tour.tours").add("l10n_es_pos_settle_account_due", {
    test: true,
    steps: () =>
        [
            ProductScreen.confirmOpeningPopup(),
            ProductScreen.clickPartnerButton(),
            PartnerListScreen.clickPartnerDetailsButton("Partner Test 1"),
            {
                trigger: `.button:contains("Settle due accounts")`,
            },
            Utils.selectButton("Bank"),
            PaymentScreen.clickValidate(),
            Chrome.confirmPopup(),
            ReceiptScreen.isShown(),
        ].flat(),
});
