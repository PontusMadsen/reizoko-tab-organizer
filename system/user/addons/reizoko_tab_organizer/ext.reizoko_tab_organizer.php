<?php

class Reizoko_tab_organizer_ext
{
	public $version = '1.0.0';
	public $settings = array();

	public function activate_extension()
	{
		foreach (array('cp_js_end', 'cp_css_end') as $hook)
		{
			ee()->db->insert('extensions', array(
				'class'    => __CLASS__,
				'method'   => $hook,
				'hook'     => $hook,
				'settings' => serialize(array()),
				'priority' => 10,
				'version'  => $this->version,
				'enabled'  => 'y',
			));
		}
	}

	public function update_extension($current = '')
	{
		return $current !== $this->version;
	}

	public function disable_extension()
	{
		ee()->db->where('class', __CLASS__)->delete('extensions');
	}

	public function cp_js_end()
	{
		$js = ee()->extensions->last_call ?: '';

		// Divider data for the publish page: JS requests this same endpoint with
		// the channel (create) or entry (edit) id taken from the CP URL.
		$channel_id = (int) ee()->input->get('rtb_channel');
		$entry_id = (int) ee()->input->get('rtb_entry');

		if ($channel_id || $entry_id)
		{
			return $js . 'window.RTB_DIVIDERS=' . json_encode(
				$this->dividersFor($channel_id, $entry_id),
				JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
			) . ';';
		}

		return $js . "\n" . file_get_contents(__DIR__ . '/assets/organizer.js') . "\n";
	}

	public function cp_css_end()
	{
		$css = ee()->extensions->last_call ?: '';

		return $css . "\n" . file_get_contents(__DIR__ . '/assets/organizer.css') . "\n";
	}

	/**
	 * Same layout lookup the Publish controller does: primary role first, then any role.
	 *
	 * @return array tab index => [['before' => field id|null, 'label' => string], ...]
	 */
	private function dividersFor($channel_id, $entry_id)
	{
		if ( ! $channel_id)
		{
			$entry = ee('Model')->get('ChannelEntry', $entry_id)->fields('entry_id', 'channel_id')->first();
			$channel_id = $entry ? (int) $entry->channel_id : 0;
		}

		if ( ! $channel_id || ! ee()->session->userdata('member_id'))
		{
			return array();
		}

		$site_id = ee()->config->item('site_id');

		$layout = ee('Model')->get('ChannelLayout')
			->filter('site_id', $site_id)
			->filter('channel_id', $channel_id)
			->with('PrimaryRoles')
			->filter('PrimaryRoles.role_id', ee()->session->userdata('role_id'))
			->first();

		if (empty($layout))
		{
			$layout = ee('Model')->get('ChannelLayout')
				->filter('site_id', $site_id)
				->filter('channel_id', $channel_id)
				->with('PrimaryRoles')
				->filter('PrimaryRoles.role_id', 'IN', ee()->session->getMember()->getAllRoles()->pluck('role_id'))
				->all()
				->first();
		}

		$out = array();

		if ($layout)
		{
			foreach ((array) $layout->field_layout as $i => $tab)
			{
				if ( ! empty($tab['rtb_dividers']))
				{
					$out[$i] = array_values((array) $tab['rtb_dividers']);
				}
			}
		}

		return $out;
	}
}
