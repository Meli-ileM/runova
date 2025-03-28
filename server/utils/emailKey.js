exports.encodeEmailKey = email => email.replaceAll('.', '~dot~');
exports.decodeEmailKey = key => key.replaceAll('~dot~', '.');
