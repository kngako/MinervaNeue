( function ( M ) {
	var View = M.require( 'mobile.startup/View' ),
		Icon = M.require( 'mobile.startup/Icon' ),
		notificationIcon = new Icon( {
			name: 'notifications',
			glyphPrefix: 'minerva'
		} ),
		icons = M.require( 'mobile.startup/icons' );

	/**
	 * A notification button for communicating with an NotificationOverlay
	 * @class NotificationButton
	 * @extends View
	 * @param {Object} options Configuration options
	 */
	function NotificationBadge( options ) {
		var $el,
			count = options.notificationCountRaw || 0,
			el = options.el;

		if ( el ) {
			$el = $( el );
			options.hasUnseenNotifications = $el.find( '.notification-unseen' ).length;
			options.hasNotifications = options.hasUnseenNotifications;
			options.title = $el.find( 'a' ).attr( 'title' );
			options.url = $el.find( 'a' ).attr( 'href' );
			count = Number( $el.find( 'span' ).data( 'notification-count' ) );
			options.onError = function () {
				// FIXME: Blocked on T189173. Ideally we'd use the router here.
				window.location.href = this.getNotificationURL();
			}.bind( this );
		}
		View.call( this, options );
		this.url = options.url;
		this._bindOverlayManager();
		this.setCount( count );
	}

	OO.mfExtend( NotificationBadge, View, {
		/**
		 * @cfg {object} defaults Default options hash.
		 * @cfg {string} defaults.notificationIconClass e.g. mw-ui-icon for icon
		 * @cfg {string} defaults.loadingIconHtml for spinner
		 * @cfg {boolean} defaults.hasUnseenNotifications whether the user has unseen notifications
		 * @cfg {number} defaults.notificationCountRaw number of unread notifications
		 * @memberof NotificationBadge
		 * @instance
		 */
		defaults: {
			notificationIconClass: notificationIcon.getClassName(),
			loadingIconHtml: icons.spinner().toHtmlString(),
			hasNotifications: false,
			hasUnseenNotifications: false,
			notificationCountRaw: 0
		},
		isBorderBox: false,
		/**
		 * Loads a ResourceLoader module script. Shows ajax loader whilst loading.
		 * @method
		 * @private
		 * @memberof NotificationBadge
		 * @instance
		 * @param {string} moduleName Name of a module to fetch
		 * @return {JQuery.Promise}
		 */
		_loadModuleScript: function ( moduleName ) {
			var self = this;

			this.$el.html( this.options.loadingIconHtml );
			return mw.loader.using( moduleName ).then( function () {
				// trigger a re-render once one to remove loading icon
				self.render();
			} );
		},
		/**
		 * Load the notification overlay.
		 * @method
		 * @private
		 * @memberof NotificationBadge
		 * @instance
		 * @uses NotificationsOverlay
		 * @return {JQuery.Deferred} with an instance of NotificationsOverlay
		 */
		_loadNotificationOverlay: function () {
			var self = this;

			return this._loadModuleScript( 'mobile.notifications.overlay' ).then( function () {
				var NotificationsOverlay =
					M.require( 'mobile.notifications.overlay/NotificationsOverlay' ); // resource-modules-disable-line
				return new NotificationsOverlay( {
					badge: self
				} );
			} );
		},
		/**
		 * Sets up routes in overlay manager and click behaviour for NotificationBadge
		 * This is not unit tested as it's behaviour is covered by browser tests.
		 * @memberof NotificationBadge
		 * @instance
		 * @private
		 */
		_bindOverlayManager: function () {
			var self = this,
				mainMenu = this.options.mainMenu;

			this.$el.on( 'click', $.proxy( this.onClickBadge, this ) );
			this.options.overlayManager.add( /^\/notifications$/, function () {
				return self._loadNotificationOverlay().then( function ( overlay ) {
					mainMenu.openNavigationDrawer( 'secondary' );
					overlay.on( 'hide', function () {
						mainMenu.closeNavigationDrawers();
						$( '#mw-mf-page-center' ).off( '.secondary' );
					} );

					$( '#mw-mf-page-center' ).one( 'click.secondary', function () {
						self.options.router.back();
					} );
					return overlay;
				} );
			} );
		},
		template: mw.template.get( 'skins.minerva.notifications.badge', 'badge.hogan' ),
		/**
		 * Click handler for clicking on the badge
		 * @memberof NotificationBadge
		 * @instance
		 * @return {boolean}
		 */
		onClickBadge: function () {
			this.options.router.navigate( '#/notifications' );
			// Important that we also prevent propagation to avoid interference with events that may
			// be binded on #mw-mf-page-center that close overlay
			return false;
		},
		/**
		 * Return the URL for the full non-overlay notification view
		 * @memberof NotificationBadge
		 * @instance
		 * @return {string} url
		 */
		getNotificationURL: function () {
			return this.options.url;
		},
		/**
		 * Update the notification count
		 * @memberof NotificationBadge
		 * @instance
		 * @param {number} count
		 */
		setCount: function ( count ) {
			if ( count > 100 ) {
				count = 100;
			}
			this.options.notificationCountRaw = count;
			this.options.notificationCountString = mw.message( 'echo-badge-count',
				mw.language.convertNumber( count )
			).text();
			this.options.isNotificationCountZero = count === 0;
			this.render();
		},
		/**
		 * Marks all notifications as seen
		 *
		 * @memberof NotificationBadge
		 * @instance
		 */
		markAsSeen: function () {
			this.options.hasUnseenNotifications = false;
			this.render();
		}
	} );

	M.define( 'skins.minerva.notifications/NotificationBadge', NotificationBadge );
}( mw.mobileFrontend ) );
