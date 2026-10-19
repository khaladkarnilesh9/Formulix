from django.apps import AppConfig

class CoreConfig(AppConfig):
    name = "apps.core"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        from django.db.backends.signals import connection_created
        from .search import normalize

        def configure_search(sender, connection, **kwargs):
            if connection.vendor == "sqlite":
                connection.connection.create_function("formulix_normalize", 1, lambda value: normalize(str(value or "")), deterministic=True)

        connection_created.connect(configure_search, dispatch_uid="formulix_search_normalize", weak=False)
        from .search_index import connect_signals
        connect_signals()
