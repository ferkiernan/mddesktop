use crate::services::authz::AuthorizedPaths;

#[derive(Default)]
pub struct AppState {
    pub authorized: AuthorizedPaths,
}
