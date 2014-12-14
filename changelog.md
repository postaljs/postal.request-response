#v0.3.1
* Now passing `resolverNoCache` header option on reply envelopes (and support it being passed on request envelopes) - so that postal v0.12.2 can be leveraged if present.
* Added istanbul code coverage to project.

#v0.3.0

* changed `envelope.reply` signature to pass an err as first arg, data as second (node style callback)

#v0.2.0

* refactored UMD wrapper to check for AMD first
* fixed issue where UMD wrapper was still referring to underscore instead of lodash
