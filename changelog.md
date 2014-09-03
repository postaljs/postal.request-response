#v0.3.0

* changed `envelope.reply` signature to pass an err as first arg, data as second (node style callback)

#v0.2.0

* refactored UMD wrapper to check for AMD first
* fixed issue where UMD wrapper was still referring to underscore instead of lodash