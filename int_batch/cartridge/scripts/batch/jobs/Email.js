var Mail = require('dw/net/Mail');

exports.sendEmail = function (params) {
    var mail = new Mail();
    mail.addTo(params.to);
    mail.setFrom(params.from);
    mail.setSubject(params.subject);
    mail.setContent('Email notification executed. See subject');
    return mail.send();
};
