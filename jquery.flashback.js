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

  /**
   * The default success callback will be called when a form submits
   * successfully. You can override it by supplying your own callback:
   *
   *     $(form).flashback({ success: mySuccessCallback });
   *
   */
  var defaultSuccessCallback = function(data, $xhr) {
    // 
  };

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
  var defaultParser = function(errorData) {
    var fields = {};
    for (var i in errorData) {
      if (errorData[i] instanceof Array) {
        fields[i] = errorData[i];
        continue;
      }
      fields[i] = [errorData[i]];
    }
    return fields;
  };

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
  var defaultDecorator = function(errors, fieldName) {
    return $('<div class="form-error">' + errors[0] + '</div>');
  };

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
  var defaultRenderer = function(fields) {
    var $form = this;
    $form.find('.form-error, .form-success').remove();
    fields.form && $form.prepend(fields.form);
    for (var fieldName in fields) {
      var $fieldErrors = fields[fieldName];
      $form.find('[name="' + fieldName + '"]').after($fieldErrors);
    }
  };

  /**
   * Replace the :params in a url with their respective values from an object:
   * 
   *     prepUrl('/users/:id', { id: 123 }); // returns "/users/123"
   * 
   */
  var prepUrl = function(url, data) {
    if (!data) return url;
    params = url.match(/:[a-zA-Z_]+/g);
    for (var i in params) {
      var param = params[i].substr(1);
      url = url.replace(':' + param, data[param]);
    }
    return url;
  };

  var onSubmit = function(params, args, e) {

    var $form = $(this);

    params = $.extend({
      redirect: $form.data('redirect'),
      url: $form.attr('action'),
      method: $form.attr('method') || 'post',
      parser: defaultParser,
      decorator: defaultDecorator,
      renderer: defaultRenderer,
      success: defaultSuccessCallback
    }, params);

    var ajaxParams = {
      url: params.url,
      type: params.method.toUpperCase(),
      data: $form.serialize()
    };

    $xhr = $.ajax(ajaxParams);

    $xhr.fail(function($xhr, textStatus, errorThrown) {
      var errorData, errorHTML;
      try {
        errorData = JSON.parse($xhr.responseText);
      } catch(err) {
        if (!err instanceof SyntaxError) throw err;
      }
      errorData = params.parser(errorData);
      errorHTML = {};
      for (var fieldName in errorData) {
        var fieldErrors = errorData[fieldName];
        errorHTML[fieldName] = params.decorator(fieldErrors);
      }
      params.renderer.call($form, errorHTML);
      params.error.call($form, errorData, args, $xhr, e);
    });

    $xhr.done(function(data, textStatus, $xhr) {
      if (typeof params.redirect === 'string') {
        window.location = prepUrl(params.redirect, data);
        return;
      }
      params.renderer.call($form, {});
      params.success.call($form, data, args, $xhr, e);
    });

    return false;

  };

  var plugin = function(params) {
    $forms = this;
    $forms.each(function() {
      var $form = $(this);
      if ($form.hasClass('flashback')) return;
      $form
        .addClass('flashback')
        .on('submit', function(e, args) {
          onSubmit.call(this, params, args, e);
          return false;
        });
    });
    return this;
  };

  $.fn.flashback = plugin;

})(jQuery);