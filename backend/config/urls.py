"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('api/', include('api.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/users/', include('accounts.user_urls')),
    path('api/memberships/', include('memberships.urls')),
    path('api/leaders/', include('leaders.urls')),
    path('api/events/', include('events.urls')),
    path('api/announcements/', include('announcements.urls')),
    path('api/gallery/', include('gallery.urls')),
    path('api/achievements/', include('achievements.urls')),
]

# This project is intentionally local-development only. Serve uploaded Gallery
# media from Django even when the local DEBUG environment value is false.
urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})]
