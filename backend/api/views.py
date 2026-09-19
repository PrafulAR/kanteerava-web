from django.http import JsonResponse


def health_check(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.', 'errors': {}}, status=405)

    return JsonResponse({
        'success': True,
        'message': 'Scout Group API is running.',
        'data': {'service': 'backend', 'phase': 1},
    })