"""Membership rules shared by submission, approval, and official documents."""

from .models import Membership


LEADER_OR_LIFE_MEMBER_TYPES = frozenset({
    Membership.MemberType.ALUMNI,
    Membership.MemberType.LEADER,
})


def is_leader_or_life_member(member_type):
    return member_type in LEADER_OR_LIFE_MEMBER_TYPES
