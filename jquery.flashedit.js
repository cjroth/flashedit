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
    new EditableForm($(this), params);
    return this;
  };

  function EditableForm($form, params) {

    var self = this;
    this.$form = $form;
    this.elements = [];

    this.params = $.extend({
      button: true, // should we show the edit button? (true, false)
      classEditable: 'editable' // what class do editable elements have? (default: "editable")
    }, params);

    this.$form
      .find('.' + this.params.classEditable).each(function() {
        var $element = $(this);
        var editable = new Editable($element, self.params, self);
        self.addElement(editable);
      })
      .on('edit-start', function(e, editable) {
        self.$form.addClass('editing');
      })
      .on('edit-end', function(e, editable) {
        self.$form.removeClass('editing');
      })
  }

  EditableForm.prototype.addElement = function(editable) {
    this.elements.push(editable);
    return this;
  };

  EditableForm.prototype.getElements = function(editable) {
    return this.elements;
  };

  EditableForm.prototype.each = function(cb) {
    for (var i in this.elements) {
      cb.call(this, i, this.elements[i]);
    }
    return this;
  };

  function Editable($element, params, editableForm) {

    this.$element = $element;
    this.params = params;
    this.editableForm = editableForm;
    this.$form = this.$element.parents('form');
    this.name = this.$element.data('name');
    this.mode = 'view';

    this
      .initFlashback()
      .loadExistingElements()
      .renderElements()
      .renderInput()
      .renderSubmitButton()
      .renderCancelButton()
      .renderEditButton()
      .attachEventListeners()

  }

  Editable.prototype.loadExistingElements = function() {
    var $input = this.$form.find('[name="' + this.name + '"]');
    if (!$input.length) return this;
    this.$container = $input.parent();
    this.$input = $input;
    this.$submit = this.$container.find('[type="submit"]');
    this.$cancel = this.$container.find('.editable-cancel');
    return this;
  };

  Editable.prototype.renderElements = function() {
    if (!this.$container) {
      this.$container = $('<div>')
        .addClass('editable-container')
        .insertAfter(this.$element)
    }
    this.$container.hide();
    return this;
  };

  Editable.prototype.renderInput = function() {
    if (this.$input) return this;
    this.$input = this.$element.data('options') ? renderSelectInput(this.$element) : renderTextInput(this.$element);
    this.$input.appendTo(this.$container);
    return this;
  };

  Editable.prototype.renderSubmitButton = function() {
    if (this.$submit) return this;
    this.$submit = $('<button>')
      .attr('type', 'submit')
      .text('Update')
      .addClass('btn btn-default') // @todo get these classes from somewhere else
      .appendTo(this.$container)
    return this;
  };

  Editable.prototype.renderEditButton = function() {
    if (!this.params.button) return this;
    if (this.$edit) return this;
    this.$edit = $('<button>')
      .text('Edit')
      .addClass('edit-button btn btn-default') // @todo get these classes from somewhere else
      .insertAfter(this.$element)
    return this;
  };

  Editable.prototype.renderCancelButton = function() {
    if (this.params.cancel !== 'button' && this.params.cancel !== 'both') return this;
    if (this.$cancel) return this;
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

  Editable.prototype.isAbleToEdit = function() {
    var result = true;
    this.$form.find('[data-name]').each(function() {
      if ($(this).data('mode') === 'edit') result = false;;
    })
    return result;
  };

  Editable.prototype.switchToEditMode = function() {
    if (!this.isAbleToEdit() || this.$element.data('mode') === 'edit') return this;
    this.$element.trigger('view-end', this);
    this.$element.hide();
    this.$container.show();
    this.$element.data('mode', 'edit');
    this.$edit && this.$edit.hide();
    this.$element.trigger('edit-start', this);
    this.$form.trigger('edit-start', this);
    return this;
  };

  Editable.prototype.switchToViewMode = function() {
    if (this.$element.data('mode') === 'view') return this;
    this.$element.trigger('edit-end', this);
    this.$container.hide();
    this.$element.show();
    this.$element.data('mode', 'view');
    this.$edit && this.$edit.show();
    this.$element.trigger('view-start', this);
    this.$form.trigger('edit-end', this);
    return this;
  };

  Editable.prototype.attachEventListeners = function() {

    var self = this;

    if (this.params.button === false) {
      this.$element.on('click', function() {
        self.switchToEditMode();
        return false;
      });
    }

    this.$edit && this.$edit.on('click', function() {
      self.switchToEditMode();
      return false;
    });

    this.$cancel && this.$cancel.on('click', function() {
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

    this.$form.on('edit-start', function(e, editable, data) {
      self.editableForm.each(function(i, editable) {
        editable.$edit && editable.$edit.hide();
      });
      return false;
    });

    this.$form.on('edit-end', function(e, editable, data) {
      self.editableForm.each(function(i, editable) {
        editable.$edit && editable.$edit.show();
      });
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