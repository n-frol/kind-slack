#!/usr/bin/env python
# coding: utf-8

# In[3]:


import csv
from lxml import etree as ET
from lxml.builder import ElementMaker
import re
import os
import requests
import json
import datetime
import secrets
import string
import hashlib
import calendar


# In[4]:


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


# In[5]:


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


# In[15]:


customer_addresses = csv.DictReader(open('../data/02222019customeraddresses.csv', 'rt', encoding="utf-8-sig"))

customer_address_dict = {}

for address in customer_addresses:

    if address["customer_id"] not in customer_address_dict:
        customer_address_dict[address["customer_id"]] = []

    customer_address_dict[address["customer_id"]].append({
        "entity_id": address["entity_id"],
        "first_name": address["firstname"],
        "last_name": address["lastname"],
        "address_one": address["address_one"],
        "address_two": address["addres_two"],
        "company": address["company"],
        "city": address["city"],
        "postcode": address["postcode"],
        "region": address["region"],
        "country": address["country"],
        "telephone": address["telephone"],
        "address_id": address["address_one"]
    })


# In[16]:


def get_customer_addresses(customer_no):
    ADDRESSES = []

    if customer_no in customer_address_dict:
        current_customer_addresses = customer_address_dict[customer_no]

        for address in current_customer_addresses:

            if address["region"]:

                first_name = address["first_name"]
                last_name = address["last_name"]
                company_name = ''

                if address["company"]:
                    company_name = E("company-name", address["company"])

                address1 = address["address_one"]
                address2 = ''

                if address["address_two"]:
                    address2 = E("address2", address["address_two"])

                city = address["city"]
                postal_code = str(address["postcode"])
                state_code = getStateCode(address["region"])
                country_code = address["country"]

                phone = ''
                if address["telephone"]:
                    phone = E("phone", address["telephone"])

                ADDRESSES.append(
                    E(
                        "address",
                        E("first-name", first_name),
                        E("last-name", last_name),
                        *company_name,
                        E("address1", address1),
                        *address2,
                        E("city", city),
                        E("postal-code", postal_code),
                        E("state-code", state_code),
                        E("country-code", country_code),
                        *phone,
                        **{"address-id": address["entity_id"]}
                    )
                )
    return ADDRESSES


# In[8]:


E = ElementMaker(namespace="http://www.demandware.com/xml/impex/customer/2006-10-31",
                 nsmap={None : "http://www.demandware.com/xml/impex/customer/2006-10-31"})


# In[9]:


reader = csv.DictReader(open('../data/02222019customerexport02.csv', 'rt', encoding="utf-8-sig"))

CUSTOMERS = []

for count, customer in enumerate(reader):
    customer_id = customer["customer_id"]
    email = customer["email"]
    first_name = customer["first_name"]
    last_name = customer["last_name"]
    customer_group_name = customer["customer_group_name"]
    created_date = customer["created_date"]
    last_update = customer["last_update"]
    uid = customer["uid"]

    created_date_iso = datetime.datetime.strptime(created_date, '%m/%d/%y %H:%M').isoformat()


    alphabet = string.ascii_letters + string.digits
    password_string = ''.join(secrets.choice(alphabet) for i in range(20))
    password_bytes = password_string.encode('utf-8')
    password = hashlib.md5(password_bytes)

    ADDRESSES = get_customer_addresses(customer_id)

    CUSTOMERS.append(
        E("customer",
          E("credentials",
            E("login", uid),
            E("password", password.hexdigest(),
             **{"encrypted": "true",
                "encryptionScheme": "md5",
               }
             ),
            E("enabled-flag", "true")
           ),
          E("profile",
            E("first-name", first_name),
            E("last-name", last_name),
            E("email", email),
            E("creation-date", created_date_iso)
           ),
          E("addresses",
           *ADDRESSES),
           E("customer-groups",
            E("customer-group",
              **{"group-id": customer_group_name}),
           ),
         **{"customer-no": customer_id}
         )
    )

customers_xml = (
    E.customers(
      *CUSTOMERS
    )
)


# In[10]:


schema = ET.XMLSchema(file="../schemas/customer.xsd")
if not schema.validate(customers_xml):
    print(schema.error_log)

with open(os.path.join("../data/2019022customerexport02.xml"), 'wb') as f:
    str_xml = ET.tostring(customers_xml, xml_declaration=True, pretty_print=True, encoding="UTF-8")
    f.write(str_xml)


# In[ ]:




