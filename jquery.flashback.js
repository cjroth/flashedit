/**
 *
 * jQuery Flashback
 *
 * Copyright 2014 Christopher J. Roth <chris@cjroth.com>
 * http://opensource.org/licenses/MIT
 *
 *
 * With Defaults:
 * 
 *     $('#my-form').flashback();
 *
 * With Configuration:
 *
 *    $('#my-form').flashback({
 *
 *      // redirect to url when form submits successfully
 *      redirect: 'http://mywebsite.com/redirect-to-me-when-successful',
 *
 *      // automatically submit the form when any values within it change
 *      watch: true,
 *
 *      // should we send empty values when we submit the form?
 *      sendEmptyValues: false,
 *
 *      // post form data to url (equivalent to the "method" attriute on the <form> tag)
 *      url: 'http://mywebsite.com/post-form-data-here',
 *
 *      // method, as in post, get, put, delete, etc
 *      method: 'post',
 *
 *      // custom function for parsing your errors
 *      parser: function(errorObject) {
 *        // ...
 *        return errorObject;
 *      },
 *
 *      // custom function for decorating your errors with html
 *      decorator: function(errorsArray, fieldName) {
 *        // ...
 *        return myHTML;
 *      },
 *
 *      // custom function for injecting your errors into the dom
 *      renderer: function(fields) {
 *        var $form = this;
 *        // ...
 *      },
 *
 *      // do this when the form submits successfully
 *      success: function(data) {
 *        // ...
 *      }
 *    });
 *
 * jQuery Flashback works with *any* error object format, so no matter how your
 * server formats errors to the client, it will work as long as they are valid
 * JSON and have a failing status code (>= 400). To use it, just write a function
 * to coerce your errors into this global format, mapping field names to arrays
 * of string error messages:
 * 
 *     {
 *       "email": ["There is already a user registered with that email."],
 *       "password": ["There is already a user registered with that email."]
 *     }
 *
 * It is totally unopinionated about how errors should be rendered or what frontend
 * frameworks you might want to use, so you can use it with Bootstrap, UIKit, or
 * no framework at all. By default, errors are divs with the class "form-error":
 * 
 *     <div class="form-error">This is an error message.</div>
 * 
 * But you can change this by supplying a decorator function. And you can change the
 * location within the form that it injects these errors by supplying a renderer
 * function.
 *
 * You can use it right out of the box using just some basic CSS:
 * 
 *     .form-error {
 *       color: #f00;
 *       font-weight: bold;
 *     }
 *
 * Flashback will check the form element itself for configuration attributes too:
 *
 *     <form id="myform" data-redirect="/woot">
 * 
 * Is equivalent to:
 *
 *     $('#my-form').flashback({ redirect: '/woot' });
 * 
 */
(function($) {

  $.fn.flashback = function(params) {
    this.each(function() {
      if (this._flashback) return;
      var $form = $(this);
      new Flashback($form, params);
    });
    return this;
  };

  function Flashback($form, params) {

    this.$form = $form;

    this.params = $.extend({
      redirect: this.$form.data('redirect'),
      watch: this.$form.data('watch') || false,
      sendEmptyValues: this.$form.data('send-empty-values') || false,
      url: this.$form.attr('action'),
      method: this.$form.attr('method') || 'post',
      parser: defaultParser,
      decorator: defaultDecorator,
      renderer: defaultRenderer,
      success: defaultSuccessCallback,
      error: defaultErrorCallback
    }, params);

    this.$form.get(-1)._flashback = true;
    this.attachEventListeners();

  }

  Flashback.prototype.attachEventListeners = function() {
    var self = this;
    this.$form.on('submit', function(e, args) {
      self.submit(args);
      return false;
    });
    if (this.params.watch) {
      this.$form.on('change', function() {
        self.submit();
        return false;
      });
    }
    return this;
  };

  Flashback.prototype.submit = function(args) {

    // @todo break this function up into smaller functions

    var self = this;

    var data = this.$form.serializeArray();

    var $xhr = $.ajax({
      url: this.params.url,
      type: this.params.method.toUpperCase(),
      data: self.params.sendEmptyValues ? data : prepData(data)
    });

    $xhr.fail(function($xhr, textStatus, errorThrown) {
      var errorData, errorHTML;
      try {
        errorData = JSON.parse($xhr.responseText);
      } catch(err) {
        if (!err instanceof SyntaxError) throw err;
      }
      errorData = self.params.parser(errorData);
      errorHTML = {};
      for (var fieldName in errorData) {
        var fieldErrors = errorData[fieldName];
        errorHTML[fieldName] = self.params.decorator(fieldErrors);
      }
      self.params.renderer.call(self.$form, errorHTML);
      self.params.error.call(self.$form, errorData);
      self.$form.trigger('error', [args, errorData]);
    });

    $xhr.done(function(data, textStatus, $xhr) {
      if (typeof self.params.redirect === 'string') {
        window.location = prepUrl(self.params.redirect, data);
        return;
      }
      self.params.renderer.call(self.$form, {});
      self.params.success.call(self.$form, data);
      self.$form.trigger('success', [args, data]);
    });

    return this;

  };

  /**
   * The default success callback will be called when a form submits
   * successfully. You can override it by supplying your own callback:
   *
   *     $(form).flashback({ success: mySuccessCallback });
   *
   */
  function defaultSuccessCallback(data, $xhr) {
    // 
  }

  /**
   * The default error callback will be called when a form has errors. You can
   * override it by supplying your own callback:
   *
   *     $(form).flashback({ error: myErrorCallback });
   *
   */
  function defaultErrorCallback(data, $xhr) {
    // 
  }

  /**
   * The default parser takes an error object where some properties are strings
   * and other properties may be in the form of arrays:
   *
   *     {
   *       "email": "There is already a user registered with that email.",
   *       "password": ["There is already a user registered with that email."]
   *     }
   * 
   * and returns an error object where all field errors are arrays of strings:
   *
   *     {
   *       "email": ["There is already a user registered with that email."],
   *       "password": ["There is already a user registered with that email."]
   *     }
   *
   * If your errors are in a different format, you can override this behavior
   * by supplying your own error parser:
   * 
   *     $(form).flashback({ parser: myErrorParser });
   * 
   */
  function defaultParser(errorData) {
    var fields = {};
    for (var i in errorData) {
      if (errorData[i] instanceof Array) {
        fields[i] = errorData[i];
        continue;
      }
      fields[i] = [errorData[i]];
    }
    return fields;
  }

  /**
   * The default error decorator takes the first error in an array and wraps
   * it with a `<div class="form-error">`.
   * 
   * The philosophy is that one error per field is enough and if the second error
   * persists after the user corrects the first one, then the form will simply
   * show the second error the second time the user submits the form.
   * 
   * You can override the default error decorator by supplying your own:
   *
   *     $(form).flashback({ decorator: myErrorDecorator });
   *
   */
  function defaultDecorator(errors, fieldName) {
    return $('<div class="form-error">' + errors[0] + '</div>');
  }

  /**
   * The default renderer takes an object mapping field names to error HTML and
   * injects the HTML into the form.
   * 
   * It will insert field errors immediately after their input elements:
   *
   *     <input name="email" type="text" placeholder="Email">
   *     <div class="form-error">There is already a user registered with that email.</div>
   * 
   * And it treats the property "form" specially, prepending any form errors to
   * the form itself:
   * 
   *     <form id="register">
   *         <div class="form-error">There was an error creating your account.</div>
   *
   * You can override the default error render by supplying your own:
   *
   *     $(form).flashback({ renderer: myErrorRenderer });
   *
   */
  function defaultRenderer(fields) {
    var $form = this;
    $form.find('.form-error, .form-success').remove();
    fields.form && $form.prepend(fields.form);
    for (var fieldName in fields) {
      var $fieldErrors = fields[fieldName];
      $form.find('[name="' + fieldName + '"]').after($fieldErrors);
    }
  }

  /**
   * Replace the :params in a url with their respective values from an object:
   * 
   *     prepUrl('/users/:id', { id: 123 }); // returns "/users/123"
   * 
   */
  function prepUrl(url, data) {
    if (!data) return url;
    params = url.match(/:[a-zA-Z_]+/g);
    for (var i in params) {
      var param = params[i].substr(1);
      url = url.replace(':' + param, data[param]);
    }
    return url;
  }

  function prepData(data) {
    var newData = {};
    for (var i in data) {
      if (data[i].value) newData[data[i].name] = data[i].value;
    }
    return newData;
  }

  $('.flashback').flashback();

})(jQuery);