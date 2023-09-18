/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2023 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
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
        strikeChecked: null,

        data: function () {
            var itemHtmlList = [];
            (this.selected || []).forEach(jsonItem => {
                itemHtmlList.push(this.getItemHtml(jsonItem));
            });

            return _.extend({
                selected: this.selected,
                translatedOptions: this.translatedOptions,
                hasOptions: this.params.options ? true : false,
                itemHtmlList: itemHtmlList,
                isEmpty: (this.selected || []).length === 0,
                valueIsSet: this.model.has(this.name),
                maxItemLength: this.maxItemLength,
                strikeChecked: this.params.strikeChecked,
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

        getItemHtml(jsonItem) {
            const { label, state } = jsonItem;
            let labelValue = this.escapeValue(label);
            if (this.translatedOptions && labelValue in this.translatedOptions) {
                labelValue = this.escapeValue(this.translatedOptions[labelValue].toString());
            }
            const dataName = `checklistItem-${this.name}-${labelValue}`;
            const id = `checklist-item-${this.name}-${labelValue}`;
            const isChecked = this.isInversed ? !parseInt(state) : !!parseInt(state);
            const dataValue = this.escapeValue(JSON.stringify(jsonItem));
            return `
            <div class="list-group-item" data-value="${dataValue}" data-label="${labelValue}" style="cursor: default;">
              <div style="display: flex; align-items: center; width: 100%; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                  <div style="margin-right: 5px; vertical-align: top; margin: -0px 0 -0px;">
                    <input type="checkbox" class="form-checkbox" style="vertical-align: top;" data-name="${dataName}" id="${id}"${isChecked ? ' checked' : ''}>
                  </div>
                  <div style="display: inline-block; max-width: 85%;">
                    <label for="${id}" class="checklist-label" style="overflow-y: center !important;">${labelValue}</label>
                  </div>
                </div>
                <div style="display: flex; align-items: center;">
                  <a href="javascript:" data-value="${labelValue}" data-action="editValue" style="margin-right: 10px;"><span class="fas fa-pencil-alt fa-sm"></span></a>
                  <a href="javascript:" data-value="${labelValue}" data-action="removeValue"><span class="fas fa-trash-alt"></span></a>
                </div>
              </div>
            </div>
          `;
        },
        
        addValue: function (label) {
            const hasExistingItem = this.selected.some(item => item.label.toString() === label.toString());
        
            if (!hasExistingItem) {
                const newItem = {
                    offVal: "0",
                    label: label,
                    state: "0"
                };
        
                const newItemHtml = this.getItemHtml(newItem);
                this.$list.append(newItemHtml);
        
                this.selected.push(newItem);
                this.trigger('change');
                
                const escapedLabel = this.escapeValue(newItem.label);
                const id = `checklist-item-${this.name}-${escapedLabel}`;
                this.$el.find(`#${id}`).on('change', () => {
                    this.fetchFromDom();
                    this.trigger('change');
                });
            } else {
                Espo.Ui.error('Duplicate checklist labels are not allowed.');
            }
        },
              
        editLabel: function (existingLabel) {
            const escapedLabel = existingLabel.replace(/"/g, '\\"');
            this.$list.children(`[data-label="${escapedLabel}"]`).remove();
            this.existingObj = this.selected.find(item => item.label === existingLabel);
            const $inputContainer = $('input.updateItem');
            $inputContainer.val(existingLabel);
            this.$el.find('div.addItem').hide();
            this.$el.find('div.updateItem').show();
        
            $inputContainer.on('input', () => {
                this.controlUpdateItemButton();
            });
        
            this.controlUpdateItemButton();
        },     

        updateLabel: function (newLabel) {
            const hasExistingItem = this.selected.some(item => item.label.toString() === newLabel.toString() && item !== this.existingObj);
        
            if (hasExistingItem) {
                Espo.Ui.error('Duplicate checklist labels are not allowed.');
            } else {
                const index = this.selected.indexOf(this.existingObj);
                this.selected[index].label = newLabel;
                this.selected[index].state = this.existingObj.state;
                const updatedItemHtml = this.getItemHtml(this.selected[index]);
                this.$list.append(updatedItemHtml);
                this.trigger('change');
            }
        },

        removeValue: function (label) {
            const escapedLabel = label.replace(/"/g, '\\"');
            this.$list.children(`[data-label="${escapedLabel}"]`).remove();
            const targetObj = this.selected.find(item => item.label === label);
            const index = this.selected.indexOf(targetObj);
            this.selected.splice(index, 1);
            this.trigger('change');
        },

        getValueForDisplay() {
            const list = this.selected.map(jsonItem => {
                const { label, state } = jsonItem;
                let labelValue = this.escapeValue(label);
                if (this.translatedOptions && labelValue in this.translatedOptions) {
                    labelValue = this.escapeValue(this.translatedOptions[labelValue].toString());
                }
                labelValue = labelValue || this.translate('None');
                const style = this.styleMap[label] || 'default';
                const dataName = `checklistItem-${this.name}-${labelValue}`;
                const id = `checklist-item-${this.name}-${labelValue}`;
                const isChecked = this.isInversed ? !parseInt(state) : !!parseInt(state);
                const disabled = 'disabled="disabled"';
                const checkboxHtml = `<div style="display:inline-block; margin-right:5px; vertical-align:top;">
                                        <input type="checkbox" class="form-checkbox" data-name="${dataName}" id="${id}"${isChecked ? ' checked' : ''} ${disabled}>
                                    </div>`;
                const strikeStyle = (this.params.strikeChecked && isChecked) ? 'text-decoration: line-through;' : '';
                const labelHtml = this.params.displayAsLabel ? `<span class="label label-md label-${style}" style="${strikeStyle}">${labelValue}</span>` : (style && style != 'default') ? `<span class="text-${style}" style="${strikeStyle}">${labelValue}</span>` : `<span style="${strikeStyle}">${labelValue}</span>`;
                return `<div style="padding-top:2px;padding-bottom:3px;">${checkboxHtml}<div style="display:inline-block;max-width:95%;">${labelHtml}</div></div>`;
            });
            const itemClassName = `multi-enum-item-container${this.displayAsLabel ? ' multi-enum-item-label-container' : ''}`;
            return list.length ? `<div class="${itemClassName}">${list.join(`</div><div class="${itemClassName}">`)}</div>` : '';
        },

        
        escapeValue: function (value) {
            return Handlebars.Utils.escapeExpression(value);
        },

        fetchFromDom: function () {
            const selectedItems = [];
        
            this.$el.find('.list-group .list-group-item').each((i, el) => {
                const $el = $(el);
                const existingValue = $el.data('value');
                const label = existingValue.label;
                const currentState = $el.find('input:checkbox:first:checked').length.toString();
        
                const updatedValue = {
                    label: label,
                    state: currentState
                };
        
                $el.attr('data-value', updatedValue);
                selectedItems.push(updatedValue);
            });
        
            this.selected = selectedItems;
        },

        controlAddItemButton: function () {
            const $addItemInput = this.$addItemInput;
            if (!$addItemInput || !$addItemInput.get(0)) return;
        
            const value = $addItemInput.val().toString().trim();
            const isDuplicate = this.selected.some(item => {
                // Ignore the item being edited
                if (this.existingObj && item.label === this.existingObj.label) {
                    return false;
                }
                return item.label.toString() === value;
            });
            const isDisabled = (!value && this.params.noEmptyString) || isDuplicate;
        
            this.$addButton.toggleClass('disabled', isDisabled).prop('disabled', isDisabled);
        },           

        controlUpdateItemButton: function () {
            const $updateItemInput = this.$updateItemInput;
            if (!$updateItemInput) return;
            if (!$updateItemInput.get(0)) return;
        
            const value = $updateItemInput.val().toString().trim();
            const isDuplicate = this.selected.some(item => item.label.toString() === value && item !== this.existingObj);
            
            if ((!value && this.params.noEmptyString) || isDuplicate) {
                this.$updateButton.addClass('disabled').attr('disabled', 'disabled');
            } else {
                this.$updateButton.removeClass('disabled').removeAttr('disabled');
            }
        },

        afterRender: function () {
            if (this.mode === 'edit') {
                this.$list = this.$el.find('.list-group');
                const $addItemInput = this.$addItemInput = this.$el.find('input.addItem');
                const $updateItemInput = this.$updateItemInput = this.$el.find('input.updateItem');
        
                if (this.allowCustomOptions) {
                    this.$addButton = this.$el.find('button[data-action="addItem"]');
                    this.$updateButton = this.$el.find('button[data-action="updateItem"]');
        
                    const onAddButtonClick = () => {
                        const label = $addItemInput.val().toString().trim();
                        if (this.params.noEmptyString && label === '') return;
                    
                        const isDuplicate = this.selected.some(item => {
                            // Ignore the item being edited
                            if (this.existingObj && item.label === this.existingObj.label) {
                                return false;
                            }
                            return item.label.toString() === label;
                        });
                    
                        if (!isDuplicate) {
                            this.addValue(label);
                            $addItemInput.val('');
                            this.controlAddItemButton();
                            this.inlineEditSave();
                            this.inlineEdit();
                        } else {
                            Espo.Ui.error('Duplicate checklist labels are not allowed.');
                        }
                    };
                    
                    const onUpdateButtonClick = () => {
                        const label = $updateItemInput.val().toString().trim();
                        if (this.params.noEmptyString && label === '') return;
                    
                        const isDuplicate = this.selected.some(item => {
                            // Ignore the item being edited
                            if (this.existingObj && item.label === this.existingObj.label) {
                                return false;
                            }
                            return item.label.toString() === label;
                        });
                    
                        if (!isDuplicate) {
                            this.updateLabel(label);
                            $updateItemInput.val('');
                            this.controlUpdateItemButton();
                            this.inlineEditSave();
                            this.inlineEdit();
                        } else {
                            Espo.Ui.error('Duplicate checklist labels are not allowed.');
                        }
                    };
                    
        
                    const onInputEvent = (inputField, controlFunc) => {
                        return () => {
                            controlFunc.call(this);
                            inputField.on('keydown', (e) => {
                                let key = Espo.Utils.getKeyFromKeyEvent(e);
                                if (key === 'Enter') {
                                    const label = inputField.val().toString().trim();
                                    if (this.params.noEmptyString && label === '') return;
                    
                                    const isDuplicate = this.selected.some(item => {
                                        // Ignore the item being edited
                                        if (this.existingObj && item.label === this.existingObj.label) {
                                            return false;
                                        }
                                        return item.label.toString() === label;
                                    });
                    
                                    if (!isDuplicate) {
                                        this[inputField.hasClass('addItem') ? 'addValue' : 'updateLabel'](label);
                                        inputField.val('');
                                        controlFunc.call(this);
                                    } else {
                                        Espo.Ui.error('Duplicate checklist labels are not allowed.');
                                    }
                                }
                            });
                        };
                    };
        
                    this.$addButton.on('click', onAddButtonClick.bind(this));
                    this.$updateButton.on('click', onUpdateButtonClick.bind(this));
                    $addItemInput.on('input', onInputEvent($addItemInput, this.controlAddItemButton).bind(this));
                    $updateItemInput.on('input', onInputEvent($updateItemInput, this.controlUpdateItemButton).bind(this));

                    $addItemInput.on('keydown', (e) => {
                        let key = Espo.Utils.getKeyFromKeyEvent(e);
                        if (key === 'Enter') {
                            onAddButtonClick.call(this);
                        }
                    });

                    $updateItemInput.on('keydown', (e) => {
                        let key = Espo.Utils.getKeyFromKeyEvent(e);
                        if (key === 'Enter') {
                            onUpdateButtonClick.call(this);
                        }
                    });

                    this.controlAddItemButton();
                }
        
                this.$list.sortable({
                    stop: () => {
                        this.fetchFromDom();
                        this.trigger('change');
                    }
                });
            }
        
            if (this.mode === 'search') {
                this.renderSearch();
            }
        
            this.$el.find('input:checkbox').on('change', () => {
                this.fetchFromDom();
                this.trigger('change');
            });
        }        
    });
});