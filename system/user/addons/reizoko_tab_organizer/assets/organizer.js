(function ($) {
	'use strict';

	var STEPS = [25, 33.33, 50, 66.66, 75, 100];
	var GAP = 12;

	function snap(pct) {
		var best = STEPS[0];
		STEPS.forEach(function (s) {
			if (Math.abs(s - pct) < Math.abs(best - pct)) { best = s; }
		});
		return best;
	}

	function label(pct) {
		return Math.round(pct) + '%';
	}

	function setCardWidth($card, pct) {
		$card.css('width', 'calc(' + pct + '% - ' + (GAP * (1 - pct / 100)) + 'px)');
		$card.find('.rtb-width').text(label(pct));
	}

	// Publish page: draw saved dividers between fields.
	function renderDividers(data) {
		Object.keys(data).forEach(function (i) {
			var $tab = $('.tab-wrap div.tab.t-' + i);
			data[i].forEach(function (d) {
				var $el = $('<div class="rtb-divider"><span class="rtb-divider__label"></span></div>');
				$el.find('.rtb-divider__label').text(d.label || '').toggle(!!d.label);
				var $anchor = d.before ? $tab.children('[data-field_id="' + d.before + '"]').first() : $();
				if ($anchor.length) { $anchor.before($el); } else { $tab.append($el); }
			});
		});
	}

	$(function () {
		if ($('form#layout-form').length === 0 && $('.tab-wrap .tab').length && window.EE) {
			var m = location.href.match(/publish\/create\/(\d+)/);
			var e = location.href.match(/publish\/edit\/entry\/(\d+)/);
			if (m || e) {
				var src = (EE.BASE || '') + '&C=javascript&M=load&file=ext_scripts&' +
					(m ? 'rtb_channel=' + m[1] : 'rtb_entry=' + e[1]);
				var el = document.createElement('script');
				el.src = src;
				el.onload = function () { if (window.RTB_DIVIDERS) { renderDividers(window.RTB_DIVIDERS); } };
				document.head.appendChild(el);
			}
			return;
		}

		var $form = $('form#layout-form');
		if (!$form.length || !window.EE || !EE.publish_layout) { return; }

		var $sheets = $form.find('.tab-wrap div.tab');
		var active = false;
		var snapshot = null;

		// Native list: show each field at its chosen width, side by side.
		function applyNativeWidths() {
			$form.find('.layout-item-wrapper > .js-layout-item').each(function () {
				var pct = parseFloat($(this).find('.field-option-width select').val());
				if (isNaN(pct)) { pct = 100; }
				var w = 'calc(' + pct + '% - ' + (GAP * (1 - pct / 100)) + 'px)';
				if (this.style.width !== w) { this.style.width = w; }
			});
		}
		// Native list: draw saved dividers above the field they are anchored to.
		// DOM item j <-> EE.publish_layout[tab].fields[j] (EE keeps both in sync).
		function renderNativeDividers() {
			$form.find('.rtb-native-divider').remove();
			$form.find('.tab-wrap div.tab').each(function (i) {
				var tab = EE.publish_layout[i];
				if (!tab || !tab.rtb_dividers || !tab.rtb_dividers.length) { return; }
				var $wrap = $(this).find('.layout-item-wrapper');
				var $items = $wrap.children('.js-layout-item');
				tab.rtb_dividers.forEach(function (d) {
					var $el = $('<div class="rtb-divider rtb-native-divider"><span class="rtb-divider__label"></span></div>');
					$el.find('.rtb-divider__label').text(d.label || '').toggle(!!d.label);
					var at = -1;
					tab.fields.forEach(function (f, j) { if (f && String(f.field) === String(d.before)) { at = j; } });
					if (at > -1 && $items.eq(at).length) { $items.eq(at).before($el); } else { $wrap.append($el); }
				});
			});
		}

		var nativeObserver = new MutationObserver(function () {
			nativeObserver.disconnect();
			applyNativeWidths();
			renderNativeDividers();
			observeNative();
		});
		function observeNative() {
			nativeObserver.observe($form.find('.tab-wrap')[0] || $form[0], { childList: true, subtree: true });
		}
		applyNativeWidths();
		renderNativeDividers();
		$form.on('change', '.field-option-width select', applyNativeWidths);
		// Items dropped onto another tab are re-created by EE; reapply when the lists change.
		observeNative();

		var $hint = $('<div class="rtb-hint" hidden>Drag cards to reorder. Drag the right edge (or use ← →) to resize. Cards that fit share a line.</div>');
		$form.find('.tab-bar.layout').before($hint);

		var $btns = $form.find('.panel-footer .form-btns').last();
		if (!$btns.length) { $btns = $form.find('.form-btns').last(); }
		var $toggle = $('<button type="button" class="button button--default rtb-toggle">Enable reorganize</button>');
		var $addDivider = $('<button type="button" class="button button--default rtb-add-divider" hidden>Add divider</button>');
		var $save = $('<button type="button" class="button button--primary rtb-save" hidden>Save organizing</button>');
		$btns.prepend($toggle, $addDivider, $save);

		function nativeButtons() {
			return $form.find('.form-btns').find('button, input[type=submit]').not($toggle).not($addDivider).not($save);
		}

		function fieldsOf(i) {
			return EE.publish_layout[i].fields.filter(function (f) { return f && f.field !== undefined; });
		}

		function widthOf(f) {
			var w = parseFloat(f.width);
			return isNaN(w) ? 100 : w;
		}

		function dividerCard(d) {
			var $d = $(
				'<div class="rtb-card rtb-divider-card">' +
				'<span class="rtb-grip" title="Drag to move"></span>' +
				'<input type="text" class="rtb-divider-name" placeholder="Divider name (optional)" aria-label="Divider name">' +
				'<button type="button" class="rtb-divider-remove" aria-label="Remove divider" title="Remove divider">&times;</button>' +
				'</div>'
			);
			$d.find('input').val(d.label || '');
			return $d;
		}

		// Rebuild tab.fields order and tab.rtb_dividers from the canvas DOM.
		function commit($canvas, i) {
			var byId = {};
			EE.publish_layout[i].fields.forEach(function (f) { if (f) { byId[f.field] = f; } });
			var fields = [], dividers = [], pending = [];
			$canvas.children('.rtb-card').each(function () {
				var $c = $(this);
				if ($c.hasClass('rtb-divider-card')) {
					pending.push({ before: null, label: $c.find('input').val().trim() });
				} else if (byId[$c.attr('data-field')]) {
					var id = $c.attr('data-field');
					pending.forEach(function (d) { d.before = id; dividers.push(d); });
					pending = [];
					fields.push(byId[id]);
				}
			});
			dividers = dividers.concat(pending);
			EE.publish_layout[i].fields = fields;
			if (dividers.length) { EE.publish_layout[i].rtb_dividers = dividers; }
			else { delete EE.publish_layout[i].rtb_dividers; }
		}

		function build() {
			$sheets.each(function (i) {
				var $sheet = $(this);
				var $wrap = $sheet.find('.layout-item-wrapper');
				var $items = $wrap.children('.js-layout-item');
				var tab = EE.publish_layout[i];
				var fields = tab ? tab.fields : [];
				var dividers = (tab && tab.rtb_dividers) || [];
				var $canvas = $('<div class="rtb-canvas"></div>');

				// DOM order == array order (layout.js keeps them in sync).
				var known = {};
				fields.forEach(function (f) { if (f) { known[f.field] = true; } });
				function addDividersBefore(id) {
					dividers.forEach(function (d) {
						if ((d.before || null) === id) { $canvas.append(dividerCard(d)); }
					});
				}

				fields.forEach(function (f, j) {
					addDividersBefore(String(f.field));
					var $src = $items.eq(j);
					var title = $src.find('.layout-item__title').clone().children().remove().end().text().trim();
					var short = $src.find('.layout-item__title .faded').last().text().trim();
					var $card = $(
						'<div class="rtb-card" data-field="' + f.field + '">' +
						'<span class="rtb-grip" title="Drag to move"></span>' +
						'<span class="rtb-title"></span><span class="rtb-short"></span>' +
						'<span class="rtb-width"></span>' +
						'<span class="rtb-resize" tabindex="0" role="slider" aria-label="Field width" title="Drag to resize"></span>' +
						'</div>'
					);
					$card.find('.rtb-title').text(title);
					$card.find('.rtb-short').text(short);
					setCardWidth($card, widthOf(f));
					$canvas.append($card);
				});

				// Trailing dividers, plus any whose anchor field no longer exists.
				dividers.forEach(function (d) {
					if (!d.before || !known[d.before]) { $canvas.append(dividerCard(d)); }
				});

				$sheet.find('.rtb-canvas').remove();
				$wrap.after($canvas);

				$canvas.sortable({
					items: '> .rtb-card',
					handle: '.rtb-grip',
					tolerance: 'pointer',
					placeholder: 'rtb-ph',
					forcePlaceholderSize: true,
					start: function (e, ui) {
						ui.placeholder.css({ width: ui.item.outerWidth(), height: ui.item.outerHeight() });
					},
					update: function () { commit($canvas, i); }
				});

				$canvas.on('input', '.rtb-divider-name', function () { commit($canvas, i); });
				$canvas.on('click', '.rtb-divider-remove', function () {
					$(this).closest('.rtb-card').remove();
					commit($canvas, i);
				});
			});
		}

		function activeCanvas() {
			var $sheet = $sheets.filter('.tab-open');
			return { $canvas: $sheet.find('.rtb-canvas'), i: $sheets.index($sheet) };
		}

		function setWidth($card, pct) {
			var i = $sheets.index($card.closest('div.tab'));
			var id = String($card.attr('data-field'));
			EE.publish_layout[i].fields.forEach(function (f) {
				if (f && String(f.field) === id) { f.width = pct; }
			});
			setCardWidth($card, pct);
		}

		$(document).on('pointerdown', '.rtb-resize', function (e) {
			e.preventDefault();
			var $card = $(this).closest('.rtb-card');
			var left = $card.offset().left;
			var total = $card.parent().width();
			$card.addClass('rtb-resizing');

			function move(ev) {
				setWidth($card, snap(((ev.pageX - left) / total) * 100));
			}
			function up() {
				$(document).off('pointermove', move).off('pointerup', up);
				$card.removeClass('rtb-resizing');
			}
			$(document).on('pointermove', move).on('pointerup', up);
		});

		$(document).on('keydown', '.rtb-resize', function (e) {
			if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
			e.preventDefault();
			var $card = $(this).closest('.rtb-card');
			var i = STEPS.indexOf(snap(parseFloat($card.find('.rtb-width').text())));
			i = Math.max(0, Math.min(STEPS.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
			setWidth($card, STEPS[i]);
		});

		// EE's AJAX validation re-enables Save buttons whenever a field validates
		// (e.g. after blurring Name). Keep them disabled while organizing.
		var allowNative = false;
		new MutationObserver(function () {
			if (!active || allowNative) { return; }
			nativeButtons().each(function () {
				if (!this.disabled) { $(this).prop('disabled', true).addClass('disable'); }
			});
		}).observe($form[0], { subtree: true, attributes: true, attributeFilter: ['disabled'] });

		$toggle.on('click', function () {
			active = !active;
			$form.toggleClass('rtb-on', active);
			$toggle.text(active ? 'Cancel reorganize' : 'Enable reorganize');
			$save.prop('hidden', !active);
			$addDivider.prop('hidden', !active);
			$hint.prop('hidden', !active);
			nativeButtons().prop('disabled', active).toggleClass('disable', active);
			if (active) {
				snapshot = JSON.stringify(EE.publish_layout);
				build();
			} else {
				// Cancel: native list was never touched, just restore the layout state.
				EE.publish_layout = JSON.parse(snapshot);
				$form.find('.rtb-canvas').remove();
			}
		});

		$addDivider.on('click', function () {
			var c = activeCanvas();
			if (!c.$canvas.length) { return; }
			var $d = dividerCard({ label: '' });
			c.$canvas.append($d);
			commit(c.$canvas, c.i);
			$d.find('input').trigger('focus');
		});

		$save.on('click', function () {
			// Write the layout ourselves (EE's submit handler does the same), re-enable
			// the primary Save and click it so EE's normal save pipeline runs.
			$form.find('input[name="field_layout"]').val(JSON.stringify(EE.publish_layout));
			allowNative = true;
			nativeButtons().prop('disabled', false).removeClass('disable');
			var $primary = nativeButtons().filter('[type=submit]').first();
			$primary[0].click();
			setTimeout(function () { allowNative = false; }, 100);
		});
	});
})(jQuery);
