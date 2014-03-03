/**
 *
 * jQuery Flash Edit
 *
 * Copyright 2014 Christopher J. Roth <chris@cjroth.com>
 * http://opensource.org/licenses/MIT
 *
 */
(function($) {

  var renderTextElement = function($el) {
    return $('<input>')
      .attr('type', 'text')
      .attr('name', $el.data('name'))
      .attr('class', $el.data('class'))
      .attr('value', $el.text())
  };

  var parseDataLikeCSS = function(raw) {
    var data = {};
    raw = raw.split(';');
    for (var i in raw) {
      if(!raw[i]) continue;
      var pair = raw[i].trim().split(':');
      var key = pair[0];
      var value = pair[1];
      data[key] = value;
    }
    return data;
  };

  var parseDataLikeJSON = function(raw) {
    try {
      return JSON.parse(raw);
    } catch(e) {
      return {};
    }
  };

  var parseData = function(raw) {
    if (raw.trim().charAt(0) === '{')
      return parseDataLikeJSON(raw);
    return parseDataLikeCSS(raw);
  };

  var renderSelectElement = function($el) {
    var options = parseData($el.data('options'));
    var $in = $('<select>')
      .attr('name', $el.data('name'))
      .attr('class', $el.data('class'))
    for (var value in options) {
      $('<option>')
        .attr('value', value)
        .attr('selected', options[value] === $el.text())
        .text(options[value])
        .appendTo($in);
    }
    return $in;
  };

  var generateInputElement = function($el) {
    if ($el.data('options'))
      return renderSelectElement($el);
    return renderTextElement($el);
  };

  var generateSubmitButton = function($el) {
    return $('<button>')
      .attr('type', 'submit')
      .text('Update')
      .addClass('btn btn-default') // @todo get these classes from somewhere else
  };

  var generateCancelButton = function($el) {
    return $('<button>')
      .text('Cancel')
      .addClass('btn btn-default') // @todo get these classes from somewhere else
  };

  var appendInputElement = function($el, $in) {
    $el.after($in.hide());
  };

  var appendSubmitButton = function($el, $btn) {
    $el.parent().append($btn.hide());
  };

  var appendCancelButton = function($el, $btn) {
    $el.parent().append($btn.hide());
  };

  var switchToViewMode = function($el, $in, $submit, $cancel, $form) {
    $in.hide();
    $submit.hide();
    $cancel.hide();
    $el.show();
    $form.data('mode', 'view');
  };

  var switchToEditMode = function($el, $in, $submit, $cancel, $form) {
    $el.hide();
    $in.show().focus();
    $submit.show();
    $cancel.show();
    $form.data('mode', 'edit');
  };

  var updateValue = function($el, $in, val) {
    if ($el.data('options')) {
      var options = parseData($el.data('options'));
      val = options[val];
    }
    $el.text(val);
    $in.val(val);
  };

  var init = function($el) {

    var $in = generateInputElement($el);
    var $submit = generateSubmitButton($el);
    var $cancel = generateCancelButton($el);

    var $form = $el.parents('form').flashback({
      success: function(data, args, $xhr, e) {
        var $el = args.$el;
        var $in = args.$in;
        var $submit = args.$submit;
        var $cancel = args.$cancel;
        var val = data[$in.attr('name')];
        $el.trigger('edit-end', [$in]);
        if (typeof val === 'undefined')
          val = $in.val();
        updateValue($el, $in, val);
        $in.parent().removeClass('loading');
        switchToViewMode($el, $in, $submit, $cancel, $form);
        $el.trigger('view-start', [$in]);
      },
      error: function(data, args, $xhr, e) {
        var $el = args.$el;
        var $in = args.$in;
        $el.trigger('edit-error', [$in]);
        $in.parent().removeClass('loading').addClass('error');
      }
    });

    appendInputElement($el, $in);
    appendSubmitButton($el, $submit);
    appendCancelButton($el, $cancel);

    $el.on('click', function() {
      if ($form.data('mode') === 'edit') return false;
      $el.trigger('view-end', [$in]);
      switchToEditMode($el, $in, $submit, $cancel, $form);
      $el.trigger('edit-start', [$in]);
    });

    // $in.on('blur', function(e) {
    //   $in.parent().addClass('loading');
    //   $form.trigger('submit', { $el: $el, $in: $in, $submit: $submit, $cancel: $cancel });
    // });

    $submit.on('click', function(e) {
      $in.parent().addClass('loading');
      $form.trigger('submit', { $el: $el, $in: $in, $submit: $submit, $cancel: $cancel });
      return false;
    });

    $cancel.on('click', function(e) {
      switchToViewMode($el, $in, $submit, $cancel, $form);
      return false;
    });

  };

  var plugin = function(params) {
    $(this).each(function(i, el) {
      init($(el));
    });
    return this;
  };

  $.fn.flashedit = plugin;

})(jQuery);