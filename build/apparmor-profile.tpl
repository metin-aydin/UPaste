abi <abi/4.0>,
include <tunables/global>

# Ubuntu 24+ kullanıcı ad alanı izni. Profil hem başlatıcı betiğe (/opt/.../upaste) hem Electron ikilisine
# (/opt/.../upaste-bin) uygulanır; Linux paketinde ikili, build/after-pack.cjs ile -bin adını alır.
profile "${executable}" "/opt/${sanitizedProductName}/${executable}{,-bin}" flags=(unconfined) {
  userns,

  # Site-specific additions and overrides. See local/README for details.
  include if exists <local/${executable}>
}
