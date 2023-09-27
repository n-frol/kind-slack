#!/usr/bin/env python
# coding: utf-8

# In[31]:


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


# In[32]:

address_reader = csv.DictReader(open('../data/02222019customeraddresseswithemail.csv', 'rt', encoding="utf-8-sig"))
dict_addresses = {}
for line in address_reader:
    dict_addresses[line["entity_id"]] = {
        "customer_id": line["customer_id"],
        "firstname": line["firstname"],
        "lastname": line["lastname"],
        "street": line["address_one"],
        "city": line["city"],
        "postcode": line["postcode"],
        "region": line["region"],
        "country_id": line["country"]
    }


# In[33]:

reader = csv.DictReader(open('../data/20190226tokensfinal.csv', 'rt', encoding="utf-8-sig"))
tokens = []
TOKENS = []


for line in reader:
    customer_no = line['cutsomerid']
    card_type = line['cardtype']
    card_name = line['card_name']
    masked_number = line['maskednumber']
    token = line['token']
    expiration_month = line['expiration_month']
    expiration_year = line['expiration_year']
    isDefault = line['default']
    billing_address_id = line['billing_address_id']

    firstname = ''
    lastname = ''
    street = ''
    city = ''
    postcode = ''
    region = ''
    country_id = ''

    if billing_address_id in dict_addresses:
        firstname = dict_addresses[billing_address_id]['firstname']
        lastname =  dict_addresses[billing_address_id]['lastname']
        street = dict_addresses[billing_address_id]['street']
        city = dict_addresses[billing_address_id]['city']
        postcode = dict_addresses[billing_address_id]['postcode']
        region = dict_addresses[billing_address_id]['region']
        country_id = dict_addresses[billing_address_id]['country_id']

    TOKENS.append({
        "customer_no": customer_no,
        "card_type": card_type,
        "card_name": card_name,
        "masked_number": masked_number,
        "token": token,
        "expiration_month": expiration_month,
        "expiration_year": expiration_year,
        "isDefault": isDefault,
        "billing_address_id": billing_address_id,
        "firstname": firstname,
        "lastname": lastname,
        "street": street,
        "address2": "",
        "city": city,
        "postcode": postcode,
        "region": region,
        "country_id": country_id
    })


# In[34]:


import time
timestr = time.strftime("%Y%m%d%H%M%S")

print(TOKENS)

with open('../data/tokensfinal.csv', 'w') as csv_file:
    writer = csv.writer(csv_file)
    for data in TOKENS:
        writer.writerow([
            data["customer_no"],
            data["card_type"],
            data["card_name"],
            data["masked_number"],
            data["token"],
            data["expiration_month"],
            data["expiration_year"],
            data["isDefault"],
            data["billing_address_id"],
            data["firstname"],
            data["lastname"],
            data["street"],
            data["address2"],
            data["city"],
            data["postcode"],
            data["region"],
            data["country_id"]
        ])
