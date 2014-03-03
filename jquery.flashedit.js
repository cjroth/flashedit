/**
 *
 * jQuery Flashedit
 *
 * Copyright 2014 Christopher J. Roth <chris@cjroth.com>
 * http://opensource.org/licenses/MIT
 *
 */
(function($) {

  $.fn.flashedit = function(params) {
    $(this).each(function(i, el) {
      new Editable($(el));
    });
    return this;
  };

  function Editable($el) {

    this.$element = $el;
    this.$form = this.$element.parents('form');
    this.name = this.$element.data('name');

    this.mode = 'view';

    this
      .initFlashback()
      .renderContainer()
      .renderInput()
      .renderSubmitButton()
      .renderCancelButton()
      .attachEventListeners()

  }

  Editable.prototype.renderContainer = function() {
    this.$container = $('<div>')
      .addClass('editable-edit')
      .hide()
      .insertAfter(this.$element)
    return this;
  };

  Editable.prototype.renderInput = function() {
    this.$input = this.$element.data('options') ? renderSelectInput(this.$element) : renderTextInput(this.$element);
    this.$input.appendTo(this.$container);
    return this;
  };

  Editable.prototype.renderSubmitButton = function() {
    this.$submit = $('<button>')
      .attr('type', 'submit')
      .text('Update')
      .addClass('btn btn-default') // @todo get these classes from somewhere else
      .appendTo(this.$container)
    return this;
  };

  Editable.prototype.renderCancelButton = function() {
    this.$cancel = $('<button>')
      .text('Cancel')
      .addClass('btn btn-default') // @todo get these classes from somewhere else
      .appendTo(this.$container)
    return this;
  };

  Editable.prototype.initFlashback = function() {
    var self = this;
    this.$form.flashback();
    return this;
  };

  Editable.prototype.updateValue = function(value) {
    if (this.$element.data('options'))
      value = parseData(this.$element.data('options'))[value];
    this.$element.text(value);
    this.$input.val(value);
    return this;
  };

  Editable.prototype.switchToEditMode = function() {
    if (this.$form.data('mode') === 'edit') return this;
    this.$element.trigger('view-end', this);
    this.$element.hide();
    this.$container.show();
    this.$form.data('mode', 'edit');
    this.$element.trigger('edit-start', this);
    return this;
  };

  Editable.prototype.switchToViewMode = function() {
    if (this.$form.data('mode') === 'view') return this;
    this.$element.trigger('edit-end', this);
    this.$container.hide();
    this.$element.show();
    this.$form.data('mode', 'view');
    this.$element.trigger('view-start', this);
    return this;
  };

  Editable.prototype.attachEventListeners = function() {

    var self = this;

    this.$element.on('click', function() {
      self.switchToEditMode();
      return false;
    });

    this.$cancel.on('click', function() {
      self.switchToViewMode();
      return false;
    });

    this.$submit.on('click', function() {
      self.$form.trigger('submit', self);
      self.$container.addClass('loading');
      return false;
    });

    this.$form.on('error', function(e, editable, data) {
      editable.$container.removeClass('loading');
      return false;
    });

    this.$form.on('success', function(e, editable, data) {
      editable.$container.removeClass('loading');
      editable
        .updateValue(data[editable.name] || editable.$input.val())
        .switchToViewMode()
      return false;
    });

    return this;
    
  };

  function parseData(raw) {
    if (raw.trim().charAt(0) === '{') return parseDataLikeJSON(raw);
    return parseDataLikeCSS(raw);
  }

  function parseDataLikeCSS(raw) {
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
  }

  function parseDataLikeJSON(raw) {
    try {
      return JSON.parse(raw);
    } catch(e) {
      return {};
    }
  }

  function renderTextInput($element) {
    var $input = $('<input>')
      .attr('type', 'text')
      .attr('name', $element.data('name'))
      .attr('class', $element.data('class'))
      .attr('value', $element.text())
    return $input;
  }

  function renderSelectInput($element) {
    var options = parseData($element.data('options'));
    var $input = $('<select>')
      .attr('name', $element.data('name'))
      .attr('class', $element.data('class'))
    for (var value in options) {
      $('<option>')
        .attr('value', value)
        .attr('selected', options[value] === $element.text())
        .text(options[value])
        .appendTo($input);
    }
    return $input;
  }

})(jQuery);