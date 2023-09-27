#!/usr/bin/env python
# coding: utf-8

# In[301]:


import csv
from lxml import etree as ET
from lxml.builder import ElementMaker
import re
import os
import requests
import json
import datetime
from phpserialize import *
import secrets
import string
import hashlib
import calendar


# In[302]:


NAME_BAD_CHARS = re.compile(r'([^a-zA-Z0-9_ -])')

def clean_name(name, camel_case = False):
    name = NAME_BAD_CHARS.sub('', name)
    if camel_case == False:
        return name.replace('  ', ' ').replace(' ', '-').upper()
    else:
        name = name.title().replace(' ', '').replace('-', '').replace('_', '')
        return name[0].lower() + name[1:]

def display_name(name):
    name = name.replace("-", " ").replace("_", " ").title()
    return NAME_BAD_CHARS.sub('', name)

def convert_to_dict(string):
    return [attr.strip() for attr in string.split(',')]

def get_key():
    home = os.path.expanduser("~")

    try:
        with open(os.path.join(home, ".bauergeocode.json")) as f:
            return json.load(f)["key"]
    except FileNotFoundError:
        return {"apikey": None}


# In[303]:


def getStateCode(state):
    us_state_abbrev = {
        'Alabama': 'AL',
        'Alaska': 'AK',
        'AK': 'AK',
        'Arizona': 'AZ',
        'Arkansas': 'AR',
        'California': 'CA',
        'Colorado': 'CO',
        'Connecticut': 'CT',
        'CT': 'CT',
        'Delaware': 'DE',
        'District of Columbia': 'DC',
        'Florida': 'FL',
        'Georgia': 'GA',
        'GA': 'GA',
        'Hawaii': 'HI',
        'HI': 'HI',
        'Idaho': 'ID',
        'Illinois': 'IL',
        'Indiana': 'IN',
        'Iowa': 'IA',
        'Kansas': 'KS',
        'Kentucky': 'KY',
        'Louisiana': 'LA',
        'Maine': 'ME',
        'Maryland': 'MD',
        'MD': 'MD',
        'Massachusetts': 'MA',
        'Michigan': 'MI',
        'MI': 'MI',
        'Minnesota': 'MN',
        'Mississippi': 'MS',
        'Missouri': 'MO',
        'Montana': 'MT',
        'Nebraska': 'NE',
        'Nevada': 'NV',
        'New Hampshire': 'NH',
        'New Jersey': 'NJ',
        'NJ': 'NJ',
        'New Mexico': 'NM',
        'New York': 'NY',
        'NY': 'NY',
        'North Carolina': 'NC',
        'North Dakota': 'ND',
        'Ohio': 'OH',
        'OH': 'OH',
        'Oklahoma': 'OK',
        'OK': 'OK',
        'Oregon': 'OR',
        'Pennsylvania': 'PA',
        'PA': 'PA',
        'Puerto Rico': 'PR',
        'Rhode Island': 'RI',
        'RI': 'RI',
        'South Carolina': 'SC',
        'South Dakota': 'SD',
        'Tennessee': 'TN',
        'Texas': 'TX',
        'TX': 'TX',
        'Utah': 'UT',
        'UT': 'UT',
        'Vermont': 'VT',
        'Virginia': 'VA',
        'Washington': 'WA',
        'West Virginia': 'WV',
        'Wisconsin': 'WI',
        'Wyoming': 'WY',
        'Virgin Islands': 'VI',
        'Guam': 'GU',
        'Armed Forces Pacific': 'AP',
        'Armed Forces Europe': 'AE',
        'AE': 'AE',
        'AP': 'AP',
        'Armed Forces Americas': 'AA',
        'AA': 'AA'
    }

    return us_state_abbrev[state]


# In[306]:

E = ElementMaker(namespace="http://www.demandware.com/xml/impex/order/2006-10-31",
                 nsmap={None : "http://www.demandware.com/xml/impex/order/2006-10-31"})


# In[307]:


reader = csv.DictReader(open('../data/20190226orders.csv', 'rt', encoding="utf-8-sig"))

LEGACY_ORDERS = {}

for count, order in enumerate(reader):

    if order["order_no"] not in LEGACY_ORDERS:
        LEGACY_ORDERS[order["order_no"]] = {}
        LEGACY_ORDERS[order["order_no"]]["customer_id"] = order["customer_id"]

        if order["customer_id"]:
            LEGACY_ORDERS[order["order_no"]]["guest"] = False
        else:
            LEGACY_ORDERS[order["order_no"]]["guest"] = True

        LEGACY_ORDERS[order["order_no"]]["email"] = order["email"]
        LEGACY_ORDERS[order["order_no"]]["first_name"] = order["first_name"]
        LEGACY_ORDERS[order["order_no"]]["last_name"] = order["last_name"]
        LEGACY_ORDERS[order["order_no"]]["order_no"] = order["order_no"]
        LEGACY_ORDERS[order["order_no"]]["creation_date"] = order["creation_date"]
        LEGACY_ORDERS[order["order_no"]]["last_modified"] = order["last_modified"]
        LEGACY_ORDERS[order["order_no"]]["order_state"] = order["order_state"]
        LEGACY_ORDERS[order["order_no"]]["export_status"] = order["export_status"]
        LEGACY_ORDERS[order["order_no"]]["shipping_method"] = order["shipping_method"]
        LEGACY_ORDERS[order["order_no"]]["billing_address_id"] = order["billing_address_id"]
        LEGACY_ORDERS[order["order_no"]]["shipping_address_id"] = order["shipping_address_id"]
        LEGACY_ORDERS[order["order_no"]]["currency"] = order["currency"]
        LEGACY_ORDERS[order["order_no"]]["gift_message_id"] = order["gift_message_id"]
        LEGACY_ORDERS[order["order_no"]]["productLineItems"] = []
        LEGACY_ORDERS[order["order_no"]]["order_subtotal"] = order["order_subtotal"]
        LEGACY_ORDERS[order["order_no"]]["order_total"] = order["order_total"]
        LEGACY_ORDERS[order["order_no"]]["entity"] = order["entity_id"]
        LEGACY_ORDERS[order["order_no"]]["payment_type"] = order["payment_type"]
        LEGACY_ORDERS[order["order_no"]]["cc_last4"] = order["cc_last4"]
        LEGACY_ORDERS[order["order_no"]]["cc_type"] = order["cc_type"]
        LEGACY_ORDERS[order["order_no"]]["cc_exp"] = order["cc_exp"]
        LEGACY_ORDERS[order["order_no"]]["shipment"] = {
            "shipping_id": order["entity_id"],
            "shipping_amount": order["shipping_amount"],
            "shipping_gross_price": order["shipping_gross_price"],
            "shipping_discount": order["shipping_discount"],
            "shipping_tax": order["shipping_tax"],
            "tax_percent": order["tax_percent"]
        }
        LEGACY_ORDERS[order["order_no"]]["coupon_code"] = order["coupon_code"]

    LEGACY_ORDERS[order["order_no"]]["productLineItems"].append({
        "product_id": order["sku"],
        "sku": order["sku"],
        "name": order["name"],
        "weight": order["weight"],
        "qty": order["qty_ordered"],
        "base_price": order["base_price"],
        "line_discount": order["line_discount"],
        "tax": order["tax"],
        "tax_percent": order["tax_percent"],
        "line_amt_refunded": order["line_amt_refunded"],
        "entity": order["entity_id"],
        "frequency": order["frequency"]
    })


# In[308]:


def getName(first_name, last_name):
    name = ''

    if first_name:
        name += first_name

        if last_name:
            name += ' ' + last_name

    return name

def getDate(date):
    return datetime.datetime.strptime(date, '%m/%d/%y %H:%M').isoformat()

def getOrderStatus(status):
    orderStatus = ''

    if status == 'processing':
        orderStatus = "OPEN"

    elif status == 'complete':
        orderStatus = "COMPLETED"

    elif status == 'canceled':
        orderStatus = "CANCELLED"

    elif status == 'closed':
        orderStatus = "COMPLETED"

    elif status == 'new':
        orderStatus = "NEW"

    return orderStatus

def getExportStatus(status):
    exportStatus = ''

    if status == 'canceled':
        exportStatus = 'NOT_EXPORTED'
        jdeExportStatus = 'false'

    elif status == 'closed':
        exportStatus = 'EXPORTED'
        jdeExportStatus = 'true'

    elif status == 'complete':
        exportStatus = 'EXPORTED'
        jdeExportStatus = 'true'

    elif status == 'do_not_invoice':
        exportStatus = 'NOT_EXPORTED'
        jdeExportStatus = 'false'

    elif status == 'exported_to_jde':
        exportStatus = 'EXPORTED'
        jdeExportStatus = 'true'

    elif status == 'pending':
        exportStatus = 'READY'
        jdeExportStatus = 'false'

    elif status == 'processing':
        exportStatus = 'READY'
        jdeExportStatus = 'false'

    return {
        "exportStatus": exportStatus,
        "jdeExportStatus": jdeExportStatus
    }


# In[309]:


reader = csv.DictReader(open('../data/20190226billingaddresses.csv', 'rt', encoding="utf-8-sig"))

BILLING_ADDRESSES = {}

for address in reader:
    if address["order_no"] not in BILLING_ADDRESSES:
        BILLING_ADDRESSES[address["order_no"]] = []

    BILLING_ADDRESSES[address["order_no"]] = {
        "firstname": address["firstname"],
        "lastname": address["lastname"],
        "address1": address["address_one"],
        "address2": address["address_two"],
        "city": address["city"],
        "postal_code": address["postcode"],
        "state_code": getStateCode(address["region"]),
        "country_code": address["country"],
        "phone": address["telephone"],
        "company": address["company"]
    }


# In[310]:


reader = csv.DictReader(open('../data/20190226shippingaddresses.csv', 'rt', encoding="utf-8-sig"))

SHIPPING_ADDRESSES = {}

for address in reader:
    if address["order_no"] not in BILLING_ADDRESSES:
        SHIPPING_ADDRESSES[address["order_no"]] = []

    SHIPPING_ADDRESSES[address["order_no"]] = {
        "firstname": address["firstname"],
        "lastname": address["lastname"],
        "address1": address["address_one"],
        "address2": address["address_two"],
        "city": address["city"],
        "postal_code": address["postcode"],
        "state_code": getStateCode(address["region"]),
        "country_code": address["country"],
        "phone": address["telephone"],
        "company": address["company"]
    }


# In[311]:


def get_net_price(base_price, quantity):
    return float(base_price) * float(quantity)

def get_tax_price(tax):
    tax_price = 0.00

    if tax:
        tax_price = float(tax)

    tax_price = tax_price

    return tax_price

def get_gross_price(net_price, tax):
    return float(net_price) + float(tax)

def str_price(price):
    return '{0:.2f}'.format(float(price))

def get_price_object(productLineItem):
    base_price = float(productLineItem["base_price"])
    quantity = productLineItem["qty"]
    net_price = get_net_price(base_price, quantity)
    tax_price = get_tax_price(productLineItem["tax"])
    gross_price = get_gross_price(net_price, tax_price)

    return {
        'base_price': float(productLineItem["base_price"]),
        'quantity': quantity,
        'net_price': net_price,
        'tax': tax_price,
        'gross_price': gross_price
    }

def get_discount_gross_price(discount_gross_price):
    return float(discount_gross_price)

def get_discount_net_price(discount_gross_price, tax_percent):
    inverse_tax_percent = (100 - float(tax_percent)) / 100
    return float(discount_gross_price) * inverse_tax_percent

def get_discount_tax(discount_gross_price, discount_net_price):
    return float(discount_gross_price) - float(discount_net_price)

def get_discount_base_price(discount_net_price, quantity):
    return float(discount_net_price) / float(quantity)

def get_discount_object(productLineItem):
    quantity = productLineItem["qty"]
    discount_gross_price = get_discount_gross_price(productLineItem["line_discount"])
    discount_net_price = get_discount_net_price(discount_gross_price, productLineItem["tax_percent"])
    discount_tax = get_discount_tax(discount_gross_price, discount_net_price)
    discount_base_price = get_discount_base_price(discount_net_price, quantity)

    return {
        "discount_net_price": discount_net_price,
        "discount_tax": discount_tax,
        "discount_gross_price": discount_gross_price,
        "discount_base_price": discount_base_price
    }


# In[312]:


def etProductLineItems(productLineItems):
    PRODUCT_LINE_ITEMS = []
    for productLineItem in productLineItems:
        PriceObject = get_price_object(productLineItem)

        tax_rate = '0.0'

        if productLineItem["tax_percent"]:
            tax_rate = str(float(productLineItem["tax_percent"]) / 100)

        PRODUCT_DISCOUNTS = []

        if productLineItem["line_discount"] and productLineItem["line_discount"] != '0':
            DiscountPriceObject = get_discount_object(productLineItem)

            tax = str_price(DiscountPriceObject["discount_tax"])
            '''
            if tax != '0.00':
                tax = '-' + tax
            coupon_code = []

            if productLineItem["coupon_code"]:
                coupon_code.append(E("coupon-id", productLineItem["coupon_code"]))

            PRODUCT_DISCOUNTS.append(
                E("price-adjustments",
                 E("price-adjustment",
                  E("net-price", '-' + str_price(DiscountPriceObject["discount_net_price"])),
                  E("tax", tax),
                   E("gross-price", '-' + str_price(DiscountPriceObject["discount_gross_price"])),
                   E("base-price", "-" + str_price(DiscountPriceObject["discount_base_price"])),
                   E("promotion-id", "Discount"),
                   *coupon_code
                  )
                 )
            )
            '''
        FREQUENCY = []
        if productLineItem["frequency"]:
            FREQUENCY.append(
                E("custom-attribute",
                  E("value", productLineItem["frequency"]),
                 **{"attribute-id": "subscriptionType"}
                 )
            )

        PRODUCT_LINE_ITEMS.append(
            E("product-lineitem",
              E("net-price", str_price(PriceObject['net_price'])),
              E("tax", str_price(PriceObject['tax'])),
              E("gross-price", str_price(PriceObject['gross_price'])),
              E("base-price", str_price(PriceObject['base_price'])),
              E("lineitem-text", productLineItem["name"]),
              E("product-id", productLineItem["product_id"]),
              E("product-name", productLineItem["name"]),
              E("quantity", productLineItem["qty"], **{"unit": ""}),
              E("tax-rate", tax_rate),
              E("shipment-id", productLineItem["entity"]),
              E("custom-attributes",
                E("custom-attribute",
                  E("value", productLineItem["weight"]),
                  **{"attribute-id": "weight"}
                 ),
                *FREQUENCY,
               ),
              *PRODUCT_DISCOUNTS
             )
        )

    return PRODUCT_LINE_ITEMS


# In[313]:


def etOrderTotals(order, priceType = 'order-total'):

    productLineItems = order["productLineItems"]
    shipment = order["shipment"]

    TOTALS = []
    PLI_NET_PRICE = 0.00
    PLI_TAX = 0.00
    PLI_GROSS_PRICE = 0.00

    PLI_DISCOUNT_NET_PRICE = 0.00
    PLI_DISCOUNT_TAX = 0.00
    PLI_DISCOUNT_GROSS_PRICE = 0.00

    for productLineItem in productLineItems:
        PriceObject = get_price_object(productLineItem)

        PLI_NET_PRICE += PriceObject['net_price']
        PLI_TAX += PriceObject['tax']
        PLI_GROSS_PRICE += PriceObject['gross_price']

        if productLineItem["line_discount"]:
            DiscountPriceObject = get_discount_object(productLineItem)
            PLI_DISCOUNT_NET_PRICE -= DiscountPriceObject["discount_net_price"]
            PLI_DISCOUNT_TAX -= DiscountPriceObject["discount_tax"]
            PLI_DISCOUNT_GROSS_PRICE -= DiscountPriceObject["discount_gross_price"]

    ORDER_TOTALS = [
        E("net-price", str_price(PLI_NET_PRICE + PLI_DISCOUNT_NET_PRICE)),
        E("tax", str_price(PLI_TAX + PLI_DISCOUNT_TAX)),
        E("gross-price", str_price(PLI_GROSS_PRICE + PLI_DISCOUNT_GROSS_PRICE))
    ]

    coupon_code = []
    PRODUCT_DISCOUNTS = []

    if order["coupon_code"]:
        coupon_code.append(E("coupon-id", order["coupon_code"].replace(' ','')))

    PRODUCT_DISCOUNTS.append(
        E("price-adjustments",
         E("price-adjustment",
          E("net-price", str_price(PLI_DISCOUNT_NET_PRICE)),
          E("tax", str_price(PLI_DISCOUNT_TAX)),
           E("gross-price", str_price(PLI_DISCOUNT_GROSS_PRICE)),
           E("base-price", str_price(PLI_DISCOUNT_NET_PRICE)),
           E("promotion-id", "Discount"),
           *coupon_code
          )
         )
    )

    TOTALS.append(
        E("merchandize-total",
          E("net-price", str_price(PLI_NET_PRICE)),
          E("tax", str_price(PLI_TAX)),
          E("gross-price", str_price(PLI_GROSS_PRICE)),
          *PRODUCT_DISCOUNTS
         )
    )

    TOTALS.append(
        E("adjusted-merchandize-total",
         E("net-price", str_price(PLI_NET_PRICE + PLI_DISCOUNT_NET_PRICE)),
          E("tax", str_price(PLI_TAX + PLI_DISCOUNT_TAX)),
          E("gross-price", str_price(PLI_GROSS_PRICE + PLI_DISCOUNT_GROSS_PRICE))
         )
    )

    shipping_net_price = float(shipment["shipping_amount"])
    shipping_tax = float(shipment["shipping_tax"])
    shipping_gross_price = float(shipment["shipping_amount"]) + float(shipment["shipping_tax"])

    TOTALS.append(
        E("shipping-total",
         E("net-price", str_price(shipping_net_price)),
         E("tax", str_price(shipping_tax)),
          E("gross-price", str_price(shipping_gross_price))
         )
    )

    if priceType == 'order-total':
        TOTALS.append(
            E("order-total",
              E("net-price", str_price(PLI_NET_PRICE + PLI_DISCOUNT_NET_PRICE + shipping_net_price)),
              E("tax", str_price(PLI_TAX + PLI_DISCOUNT_TAX + shipping_tax)),
              E("gross-price", str_price(PLI_GROSS_PRICE + PLI_DISCOUNT_GROSS_PRICE + shipping_gross_price))
             )
        )
    elif priceType == 'shipment-total':
        TOTALS.append(
            E("shipment-total",
              E("net-price", str_price(PLI_NET_PRICE + PLI_DISCOUNT_NET_PRICE + shipping_net_price)),
              E("tax", str_price(PLI_TAX + PLI_DISCOUNT_TAX + shipping_tax)),
              E("gross-price", str_price(PLI_GROSS_PRICE + PLI_DISCOUNT_GROSS_PRICE + shipping_gross_price))
             )
        )

    return TOTALS


# In[314]:


def getTaxRate(tax_percent, order_no):
    tax_rate = 0.0

    if tax_percent:
        tax_rate = str(float(tax_percent) / 100)

    return str(tax_rate)


def getMonth(monthAbbr):
    months = {
        'Jan': '01',
        'Feb': '02',
        'Mar': '03',
        'Apr': '04',
        'May': '05',
        'Jun': '06',
        'Jul': '07',
        'Aug': '08',
        'Sep': '09',
        'Oct': '10',
        'Nov': '11',
        'Dec': '12'
    }
    return months[monthAbbr]


# In[315]:


reader = csv.DictReader(open('../data/20190226giftmessages.csv', 'rt', encoding="utf-8-sig"))

GIFT_MESSAGES = {}

for count, message in enumerate(reader):
    GIFT_MESSAGES[message["gift_message_id"]] = {
        "sender": message["sender"],
        "recipient": message["recipient"],
        "message": message["message"]
    }


# In[316]:


ORDERS = []

for key, order in LEGACY_ORDERS.items():

    if order:
        print(order["order_no"])
        payment = []

        if order["payment_type"] == "authnetcim":
            payment_cc_type = []
            payment_masked_card = 'XXXX-XXXX-XXXX-XXXX'

            if order["cc_type"]:
                credit_type = ""
                if order["cc_type"] == "VI":
                    credit_type = "VISA"
                elif order["cc_type"] == "AE":
                    credit_type = "AMEX"
                elif order["cc_type"] == "DI":
                    credit_type = "DISCOVER"
                elif order["cc_type"] == "MC":
                    credit_type = "Master Card"
                else:
                    credit_type = order["cc_type"]

                payment_cc_type.append(E("card-type", credit_type))

            if order["cc_last4"]:
                payment_masked_card = 'XXXX-XXXX-XXX-' + order["cc_last4"]

            cc_expiration = []

            if order["cc_exp"]:
                expiration = order["cc_exp"].split('-')
                cc_expiration.append(E("expiration-month", str(getMonth(expiration[0]))))
                cc_expiration.append(E("expiration-year", expiration[1]))

            payment.append(
                E("credit-card",
                  *payment_cc_type,
                  E("card-number", payment_masked_card),
                  *cc_expiration
                 )
            )
        elif order["payment_type"] == 'paypal_express':
            payment.append(
                E("custom-method",
                 E("method-name", "PAYMENTOPERATOR_PAYPALEXPRESS")
                 )
            )
        elif order["payment_type"] == 'paypal':
            payment.append(
                E("custom-method",
                 E("method-name", "PAYMENTOPERATOR_PAYPAL")
                 )
            )

        SHIPPING_ADDRESS = SHIPPING_ADDRESSES[order["order_no"]]
        BILLING_ADDRESS = BILLING_ADDRESSES[order["order_no"]]

        state_code = SHIPPING_ADDRESS["state_code"]
        shipping_method = order["shipping_method"]

        if shipping_method == 'Ground' or shipping_method == 'Free Shipping':
            if state_code in ['AK', 'HI', 'VI']:
                shipping_method = 'premiumrate_Ground-1'
            else:
                shipping_method = 'premiumrate_Ground'
        elif shipping_method == '2nd Day':
            shipping_method = 'premiumrate_2nd_Day'

        GIFTMESSAGE = []
        if order['gift_message_id']:
            GIFTMESSAGE.append(
                    E('custom-attributes',
                        E('custom-attribute',
                            E('value', GIFT_MESSAGES[order['gift_message_id']]['sender']),
                            **{"attribute-id": "giftFrom"}
                        ),
                        E('custom-attribute',
                            E('value', GIFT_MESSAGES[order['gift_message_id']]['recipient']),
                            **{"attribute-id": "giftTo"}
                        ),
                    )
            )

        GIFTMESSAGETEXT = []
        if order['gift_message_id']:
            GIFTMESSAGETEXT.append(
                E('gift-message', GIFT_MESSAGES[order['gift_message_id']]['message'])
            )

        ORDERS.append(
            E("order",
              E("order-date", getDate(order["creation_date"])),
              E("created-by", "Customer"),
              E("currency", "USD"),
              E("customer-locale", "en_US"),
              E("taxation", "net"),
              E("customer",
                E("customer-no", order['customer_id']),
                E("customer-name", getName(order["first_name"], order["last_name"])),
                E("customer-email", order["email"]),
                E("billing-address",
                  E("first-name", BILLING_ADDRESS["firstname"]),
                  E("last-name", BILLING_ADDRESS["lastname"]),
                  E("company-name", BILLING_ADDRESS["company"]),
                  E("address1", BILLING_ADDRESS["address1"]),
                  E("address2", BILLING_ADDRESS["address2"]),
                  E("city", BILLING_ADDRESS["city"]),
                  E("postal-code", BILLING_ADDRESS["postal_code"]),
                  E("state-code", BILLING_ADDRESS["state_code"]),
                  E("country-code", BILLING_ADDRESS["country_code"]),
                  E("phone", BILLING_ADDRESS["phone"])
                 ),
               ),
              E("status",
                E("order-status", getOrderStatus(order["order_state"])),
                E("export-status", getExportStatus(order["export_status"])['exportStatus']),
               ),
              E("product-lineitems",
               *etProductLineItems(order["productLineItems"])),
              E("shipping-lineitems",
                E("shipping-lineitem",
                  E("net-price", str_price(order["shipment"]["shipping_amount"])),
                  E("tax", str_price(order["shipment"]["shipping_tax"])),
                  E("gross-price", str_price(float(order["shipment"]["shipping_amount"]) + float(order["shipment"]["shipping_tax"]))),
                 E("base-price", str_price(order["shipment"]["shipping_amount"])),
                  E("tax-basis", str_price(order["shipment"]["shipping_amount"])),
                  E("shipment-id", order["shipment"]["shipping_id"]),
                  E("tax-rate", getTaxRate(order["shipment"]["tax_percent"], order["order_no"])),
                 ),
               ),
              E("shipments",
               E("shipment",
                 E("shipping-method", shipping_method),
                 E("shipping-address",
                  E("first-name", SHIPPING_ADDRESS["firstname"]),
                  E("last-name", SHIPPING_ADDRESS["lastname"]),
                   E("company-name", SHIPPING_ADDRESS["company"]),
                  E("address1", SHIPPING_ADDRESS["address1"]),
                   E("address2", SHIPPING_ADDRESS["address2"]),
                  E("city", SHIPPING_ADDRESS["city"]),
                  E("postal-code", SHIPPING_ADDRESS["postal_code"]),
                  E("state-code", SHIPPING_ADDRESS["state_code"]),
                  E("country-code", SHIPPING_ADDRESS["country_code"]),
                  E("phone", SHIPPING_ADDRESS["phone"])
                  ),
                  *GIFTMESSAGETEXT,
                 E("totals",
                   *etOrderTotals(order, 'shipment-total')
                  ),
                 *GIFTMESSAGE,
                 **{"shipment-id": order["entity"]})
               ),
              E("totals",
                *etOrderTotals(order, 'order-total')
               ),
              E("payments",
                E("payment", *payment)
               ),
              E("custom-attributes",
               E("custom-attribute", getExportStatus(order["export_status"])['jdeExportStatus'],
                **{"attribute-id": "isExportedJDE"}
                ),
                E("custom-attribute", order["first_name"],
                **{"attribute-id": "firstName"}
                ),
                E("custom-attribute", order["last_name"],
                **{"attribute-id": "lastName"}
                )
               ),
             **{"order-no": order["order_no"]})
        )

order_xml = (
    E.orders(
      *ORDERS
    )
)


# In[317]:


schema = ET.XMLSchema(file="../schemas/order.xsd")
if not schema.validate(order_xml):
    print(schema.error_log)

with open(os.path.join("../data/20190226orders-migration.xml"), 'wb') as f:
    str_xml = ET.tostring(order_xml, xml_declaration=True, pretty_print=True, encoding="UTF-8")
    f.write(str_xml)


# In[ ]:




