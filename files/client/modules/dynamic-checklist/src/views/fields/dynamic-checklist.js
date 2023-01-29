/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2019 Yuri Kuznetsov, Taras Machyshyn, Oleksiy Avramenko
 * Website: https://www.espocrm.com
 *
 * EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

define('dynamic-checklist:views/fields/dynamic-checklist', ['views/fields/array'], function (Dep) {

    return Dep.extend({

        type: 'dynamic-checklist',

        listTemplate: 'fields/array/list',

        detailTemplate: 'fields/array/detail',

        editTemplate: 'dynamic-checklist:fields/dynamic-checklist/edit',

        searchTemplate: 'fields/array/search',

        searchTypeList: ['anyOf', 'noneOf', 'allOf', 'isEmpty', 'isNotEmpty'],

        maxItemLength: null,

        validations: ['required', 'maxCount'],

        isInversed: false,

        existingObj: null,

        displayAsList: true,

        data: function () {
            var itemHtmlList = [];
            (this.selected || []).forEach(function (jsonItem) {
                itemHtmlList.push(this.getItemHtml(jsonItem));
            }, this);

            return _.extend({
                selected: this.selected,
                translatedOptions: this.translatedOptions,
                hasOptions: this.params.options ? true : false,
                itemHtmlList: itemHtmlList,
                isEmpty: (this.selected || []).length === 0,
                valueIsSet: this.model.has(this.name),
                maxItemLength: this.maxItemLength,
                allowCustomOptions: this.allowCustomOptions
            }, Dep.prototype.data.call(this));
        },

        events: {
            'click [data-action="removeValue"]': function (e) {
                var value = $(e.currentTarget).data('value').toString();
                this.removeValue(value);
            },
            'click [data-action="editValue"]': function (e) {
                var existingValue = $(e.currentTarget).data('value').toString();
                this.editLabel(existingValue);
            }
        },

        getItemHtml: function(jsonItem) {
            // breakdown a given checklist item into its components: label and checkbox value
            var label = this.escapeValue(jsonItem.label);
            if (this.translatedOptions) {
                if ((label in this.translatedOptions)) {
                    label = this.translatedOptions[label];
                    label = label.toString();
                    label = this.escapeValue(label);
                }
            }
            var dataName = 'checklistItem-'+this.name+'-'+label;
            var id = 'checklist-item-'+this.name+'-'+label;
            var isChecked = false;
            if( jsonItem.state == "1"){
                isChecked = true;
            }
            if(this.isInversed){
                isChecked = !isChecked;
            }
            var dataValue = this.escapeValue(JSON.stringify(jsonItem));
            var itemHtml = '<div class="list-group-item" data-value="'+dataValue+'" data-label="'+label+'" style="cursor: default;">';
            itemHtml += '<div style="float:left; margin-right:5px; vertical-align:top; margin: -0px 0 -0px;"><input type="checkbox" class="form-checkbox" style="vertical-align:top;" data-name="'+dataName+'" id="'+id+'"';
            if(isChecked) {
                itemHtml += ' checked ';
            }
            itemHtml += '></div> ';
            //itemHtml += '<input class = "main-element form-control" type="text" class="checklist-label" value="'+label+'">';
            itemHtml += '<div style="display:inline-block;max-width:85%;"><label for="'+id+'" class="checklist-label" style="overflow-y: center !important;">'+label+'</label></div>';
            itemHtml += '<div style="float:right; width:10%; margin: auto;"><a href="javascript:" class="pull-right" data-value="'+label+'" data-action="removeValue"><span class="fas fa-trash-alt"></span></a>';
            itemHtml += '<a href="javascript:" class="pull-right" data-value="'+label+'" data-action="editValue" style="margin-right:10px;"><span class="fas fa-pencil-alt fa-sm"></span></a>';
            itemHtml += '</div></div>';
            return itemHtml;
        },

        addValue: function (label) {
            var isNew = true;
            // convert the label into a JSON object with the default state value of zero
            var jsonItem = {};
            jsonItem.offVal = "0";
            jsonItem.label = label;
            jsonItem.state = "0";
            var targetObj = this.selected.find(o => o.label === label);
            if(targetObj) {
                Espo.Ui.error("Duplicate checklist labels are not allowed");
                isNew = false;
            }
            // it it doesn't exist append to the "selected" array and to the list html
            if(isNew) {
                // create the rendering html code
                var html = this.getItemHtml(jsonItem);
                // append the html to the existing list of items
                this.$list.append(html);
                // append the new dynamic checklist item to the "selected" array
                this.selected.push(jsonItem);
                // trigger the "change" event
                this.trigger('change');
            }
        },

        editLabel: function (existingLabel) {
            var valueInternal = existingLabel.replace(/"/g, '\\"');
            // remove the element from the DOM
            this.$list.children('[data-label="' + valueInternal + '"]').remove();
            // get the existing item object
            this.existingObj = this.selected.find(o => o.label === existingLabel);
            // display the label on the "updateItem" input container for editing
            var $inputContainer = $('input.updateItem');
            $inputContainer.val(existingLabel);
            // hide the "addItem" input-group div and display instead the "updateItem" input-group div
            this.$el.find('div.addItem').hide();
            this.$el.find('div.updateItem').show();
            // enable the "updateItem" button
            this.controlUpdateItemButton();
        },

        updateLabel: function (newLabel) {
            // get the existing element json object position inside the array
            var index = this.selected.indexOf(this.existingObj);
            // update the array of json objects
            this.selected[index].label = newLabel;
            this.selected[index].state = this.existingObj.state;
            // create the updated element rendering html code
            var html = this.getItemHtml(this.selected[index]);
            // append the html to the existing list of items
            this.$list.append(html);
            // trigger the "change" event
            this.trigger('change');
        },

        removeValue: function (label) {
            var valueInternal = label.replace(/"/g, '\\"');
            // remove the element from the DOM
            this.$list.children('[data-label="' + valueInternal + '"]').remove();
            // find the element json object in the "selected" array
            var targetObj = this.selected.find(o => o.label === label);
            // get the element json object position inside the array
            var index = this.selected.indexOf(targetObj);
            // remove the element from the array of json objects
            this.selected.splice(index, 1);
            // trigger the 'change' event
            this.trigger('change');
        },

        getValueForDisplay: function () {
            var list = this.selected.map(function (jsonItem) {
                // get the checklist item label
                var label = this.escapeValue(jsonItem.label);
                if (this.translatedOptions) {
                    if ((label in this.translatedOptions)) {
                        label = this.translatedOptions[label];
                        label = label.toString();
                        label = this.escapeValue(label);
                    }
                }
                if (label === '') {
                    label = this.translate('None');
                }
                var style = this.styleMap[jsonItem.label] || 'default';
                if (this.params.displayAsLabel) {
                    label = '<span class="label label-md label-'+style+'">' + label + '</span>';
                } else {
                    if (style && style != 'default') {
                        label = '<span class="text-'+style+'">' + label + '</span>';
                    }
                }
                var displayHtml = '';
                // get the option checkbox boolean value and generate its html code
                var dataName = 'checklistItem-'+this.name+'-'+label;
                var id = 'checklist-item-'+this.name+'-'+label;
                var isChecked = false;
                if( jsonItem.state == "1"){
                    isChecked = true;
                }
                if(this.isInversed){
                    isChecked = !isChecked;
                }
                displayHtml += '<div style="padding-top:2px;padding-bottom:3px;">';
                displayHtml += '<div style="display:inline-block; margin-right:5px; vertical-align:top;">';
                displayHtml += '<input type="checkbox" class="form-checkbox" data-name="'+dataName+'" id="'+id+'"';
                if(isChecked) {
                    displayHtml += ' checked ';
                }
                // prevent the checkbox element from being editable in display mode
                displayHtml += 'disabled = "disabled"';
                displayHtml += '>';
                displayHtml += '</div>';
                displayHtml += '<div style="display:inline-block;max-width:95%;">'+label+'</div>';
                displayHtml += '</div>';
                //displayHtml += ' '+label;
                return displayHtml;
            }, this);
            if (this.displayAsList) {
                if (!list.length) return '';
                var itemClassName = 'multi-enum-item-container';
                if (this.displayAsLabel) {
                    itemClassName += ' multi-enum-item-label-container';
                }
                return '<div class="'+itemClassName+'">' +
                    list.join('</div><div class="'+itemClassName+'">') + '</div>';
            } else if (this.displayAsLabel) {
                return list.join(' ');
            } else {
                return list.join(', ');
            }
        },

        fetchFromDom: function () {
            var selected = [];
            this.$el.find('.list-group .list-group-item').each(function (i, el) {
                var updatedValue = {};
                // fetch the original data-value
                var existingValue = $(el).data('value');
                var label = existingValue.label;
                // fetch the current boolean value (0 or 1)
                var currentState = $(el).find('input:checkbox:first:checked').length.toString();
                // build the current item object
                updatedValue.label = label;
                updatedValue.state = currentState;
                // update the element's data-value attribute
                $(el).attr('data-value', updatedValue);
                // append the 'selected' array
                selected.push(updatedValue);
            });
            this.selected = selected;
        },

        controlAddItemButton: function () {
            var $addItemInput = this.$addItemInput;
            if (!$addItemInput) return;
            if (!$addItemInput.get(0)) return;

            var value = $addItemInput.val().toString();
            if (!value && this.params.noEmptyString) {
                this.$addButton.addClass('disabled').attr('disabled', 'disabled');
            } else {
                this.$addButton.removeClass('disabled').removeAttr('disabled');
            }
        },

        controlUpdateItemButton: function () {
            //alert("controlUpdateItemButton function invoked");
            var $updateItemInput = this.$updateItemInput;
            if (!$updateItemInput) return;
            if (!$updateItemInput.get(0)) return;

            var value = $updateItemInput.val().toString();
            if (!value && this.params.noEmptyString) {
                this.$updateButton.addClass('disabled').attr('disabled', 'disabled');
            } else {
                this.$updateButton.removeClass('disabled').removeAttr('disabled');
            }
        },

        afterRender: function () {
            if (this.mode == 'edit') {
                this.$list = this.$el.find('.list-group');

                // prepare the add item and update item inputs
                var $addItemInput = this.$addItemInput = this.$el.find('input.addItem');
                var $updateItemInput = this.$updateItemInput = this.$el.find('input.updateItem');

                if (this.allowCustomOptions) {
                    this.$addButton = this.$el.find('button[data-action="addItem"]');
                    this.$updateButton = this.$el.find('button[data-action="updateItem"]');

                    this.$addButton.on('click', function () {
                        var label = this.$addItemInput.val().toString();
                        this.addValue(label);
                        $addItemInput.val('');
                        this.controlAddItemButton();
                        // update the model
                        this.inlineEditSave();
                        // reinstate the inline edit mode
                        this.inlineEdit();
                    }.bind(this));

                    this.$updateButton.on('click', function () {
                        var label = this.$updateItemInput.val().toString();
                        this.updateLabel(label);
                        $updateItemInput.val('');
                        this.controlUpdateItemButton();
                        // update the model
                        this.inlineEditSave();
                        // reinstate the inline edit mode
                        this.inlineEdit();
                    }.bind(this));

                    $addItemInput.on('input', function () {
                        this.controlAddItemButton();
                    }.bind(this));

                    $updateItemInput.on('input', function () {
                        this.controlUpdateItemButton();
                    }.bind(this));

                    // add the new item and updated the list if user presses 'Enter' or "Tab"
                    $addItemInput.on('keypress', function (e) {
                        if (e.keyCode === 13 || e.keyCode === 9) {
                            var label = $addItemInput.val().toString();
                            if (this.params.noEmptyString) {
                                if (label == '') {
                                    return;
                                }
                            }
                            this.addValue(label);
                            $addItemInput.val('');
                            this.controlAddItemButton();
                            // update the model
                            //this.inlineEditSave();
                            // reinstate the inline edit mode
                            //this.inlineEdit();
                        }
                    }.bind(this));

                    // update the item and update the list if the user presses 'Enter'
                    $updateItemInput.on('keypress', function (e) {
                        if (e.keyCode === 13) {
                            var label = $updateItemInput.val().toString();
                            if (this.params.noEmptyString) {
                                if (label == '') {
                                    return;
                                }
                            }
                            this.updateLabel(label);
                            $updateItemInput.val('');
                            this.controlUpdateItemButton();
                            // update the model
                            //this.inlineEditSave();
                            // reinstate the inline edit mode
                            //this.inlineEdit();
                        }
                    }.bind(this));

                    this.controlAddItemButton();
                }

                this.$list.sortable({
                    stop: function () {
                        this.fetchFromDom();
                        this.trigger('change');
                    }.bind(this)
                });

            }

            if (this.mode == 'search') {
                this.renderSearch();
            }

            // whenever any checkbox changes, update the item data-value and trigger the change event
            this.$el.find('input:checkbox').on('change', function () {
                this.fetchFromDom();
                this.trigger('change');
            }.bind(this));

        }

    });
});
