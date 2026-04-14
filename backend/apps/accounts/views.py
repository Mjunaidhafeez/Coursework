from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .permissions import IsSuperAdmin
from .serializers import CustomTokenObtainPairSerializer, SelfProfileUpdateSerializer, UserCreateUpdateSerializer, UserSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    if request.method == "PATCH":
        serializer = SelfProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-id")
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["id", "username", "first_name", "last_name", "email", "role", "date_joined"]

    def get_permissions(self):
        if self.action in ["list", "retrieve", "create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return UserCreateUpdateSerializer
        return UserSerializer
