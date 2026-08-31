/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** Content rating filter for user avatars. Determines the maximum maturity level of avatars to display, following standard content rating classifications (G, PG, R, X). */
export type AvatarRatingEnum =
  /** Indicates a G level avatar rating level. */
  | 'G'
  /** Indicates a PG level avatar rating level. */
  | 'PG'
  /** Indicates an R level avatar rating level. */
  | 'R'
  /** Indicates an X level avatar rating level. */
  | 'X';

/** Identifier types for retrieving a specific Category. Determines which unique property (global ID, database ID, slug, etc.) is used to locate the Category. */
export type CategoryIdType =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the CategoryToCategoryConnection connection */
export type CategoryToCategoryConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the CategoryToContentNodeConnection connection */
export type CategoryToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypesOfCategoryEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the CategoryToPostConnection connection */
export type CategoryToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific comment. Specifies which unique attribute is used to find a particular comment. */
export type CommentNodeIdTypeEnum =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID';

/** Moderation state for user comments. Determines whether comments are publicly visible, pending approval, or marked as spam. */
export type CommentStatusEnum =
  /** Comments with the Approved status */
  | 'APPROVE'
  /** Comments with the Unapproved status */
  | 'HOLD'
  /** Comments with the Spam status */
  | 'SPAM'
  /** Comments with the Trash status */
  | 'TRASH';

/** Arguments for filtering the CommentToCommentConnection connection */
export type CommentToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the CommentToParentCommentConnection connection */
export type CommentToParentCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Sorting attributes for comment collections. Specifies which comment property determines the order of results. */
export type CommentsConnectionOrderbyEnum =
  /** Order by browser user agent of the commenter. */
  | 'COMMENT_AGENT'
  /** Order by approval status of the comment. */
  | 'COMMENT_APPROVED'
  /** Order by name of the comment author. */
  | 'COMMENT_AUTHOR'
  /** Order by e-mail of the comment author. */
  | 'COMMENT_AUTHOR_EMAIL'
  /** Order by IP address of the comment author. */
  | 'COMMENT_AUTHOR_IP'
  /** Order by URL address of the comment author. */
  | 'COMMENT_AUTHOR_URL'
  /** Order by the comment contents. */
  | 'COMMENT_CONTENT'
  /** Chronological ordering by comment submission date. */
  | 'COMMENT_DATE'
  /** Chronological ordering by comment date in UTC/GMT time. */
  | 'COMMENT_DATE_GMT'
  /** Ordering by internal ID (typically reflects creation order). */
  | 'COMMENT_ID'
  /** Preserve custom order of IDs as specified in the query. */
  | 'COMMENT_IN'
  /** Order by the comment karma score. */
  | 'COMMENT_KARMA'
  /** Ordering by parent comment relationship (threaded discussions). */
  | 'COMMENT_PARENT'
  /** Ordering by associated content item ID. */
  | 'COMMENT_POST_ID'
  /** Ordering by comment classification (standard comments, pingbacks, etc.). */
  | 'COMMENT_TYPE'
  /** Ordering by the user account ID associated with the comment as the comment author. */
  | 'USER_ID';

/** Identifier types for retrieving specific content. Determines which property (global ID, database ID, URI) is used to locate content objects. */
export type ContentNodeIdTypeEnum =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the URI. */
  | 'URI';

/** Arguments for filtering the ContentNodeToEnqueuedScriptConnection connection */
export type ContentNodeToEnqueuedScriptConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the ContentNodeToEnqueuedStylesheetConnection connection */
export type ContentNodeToEnqueuedStylesheetConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** The templates that can be assigned to content. Used to filter a connection by the template its content uses. */
export type ContentTemplateEnum =
  /** The default template, applied when no specific template is assigned. */
  | 'DEFAULT_TEMPLATE'
  /** The "Page No Title" template. */
  | 'PAGE_NO_TITLE_BLOCK_TEMPLATE';

/** Available content entity types that can be queried or filtered. Identifies the primary content structures available in the system. */
export type ContentTypeEnum =
  /** The Type of Content object */
  | 'ATTACHMENT'
  /** The Type of Content object */
  | 'PAGE'
  /** The Type of Content object */
  | 'POST'
  /** The Type of Content object */
  | 'TIO2_APPLICATION'
  /** The Type of Content object */
  | 'TIO2_DOCUMENT'
  /** The Type of Content object */
  | 'TIO2_FAQ'
  /** The Type of Content object */
  | 'TIO2_GRADE'
  /** The Type of Content object */
  | 'TIO2_HOMEPAGE'
  /** The Type of Content object */
  | 'TIO2_PRODUCT';

/** Identifier types for retrieving a specific content type definition. Determines whether to look up content types by ID or name. */
export type ContentTypeIdTypeEnum =
  /** The globally unique ID */
  | 'ID'
  /** The name of the content type. */
  | 'NAME';

/** Arguments for filtering the ContentTypeToContentNodeConnection connection */
export type ContentTypeToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Allowed Content Types of the Category taxonomy. */
export type ContentTypesOfCategoryEnum =
  /** The Type of Content object */
  | 'POST';

/** Allowed Content Types of the PostFormat taxonomy. */
export type ContentTypesOfPostFormatEnum =
  /** The Type of Content object */
  | 'POST';

/** Allowed Content Types of the ProductFamily taxonomy. */
export type ContentTypesOfProductFamilyEnum =
  /** The Type of Content object */
  | 'TIO2_PRODUCT';

/** Allowed Content Types of the SiteScope taxonomy. */
export type ContentTypesOfSiteScopeEnum =
  /** The Type of Content object */
  | 'PAGE'
  /** The Type of Content object */
  | 'POST'
  /** The Type of Content object */
  | 'TIO2_APPLICATION'
  /** The Type of Content object */
  | 'TIO2_DOCUMENT'
  /** The Type of Content object */
  | 'TIO2_FAQ'
  /** The Type of Content object */
  | 'TIO2_GRADE'
  /** The Type of Content object */
  | 'TIO2_HOMEPAGE'
  /** The Type of Content object */
  | 'TIO2_PRODUCT';

/** Allowed Content Types of the Tag taxonomy. */
export type ContentTypesOfTagEnum =
  /** The Type of Content object */
  | 'POST';

/** Input for the createCategory mutation. */
export type CreateCategoryInput = {
  /** The slug that the category will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the category object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the category object to mutate */
  readonly name: Scalars['String']['input'];
  /** The database ID of the category that should be set as the parent. This field cannot be used in conjunction with parentId */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the category that should be set as the parent. This field cannot be used in conjunction with parentDatabaseId */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createComment mutation. */
export type CreateCommentInput = {
  /**
   * The approval status of the comment.
   * @deprecated Deprecated in favor of the status field
   */
  readonly approved?: InputMaybe<Scalars['String']['input']>;
  /** The name of the comment's author. */
  readonly author?: InputMaybe<Scalars['String']['input']>;
  /** The email of the comment's author. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** The url of the comment's author. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The database ID of the post object the comment belongs to. */
  readonly commentOn?: InputMaybe<Scalars['Int']['input']>;
  /** Content of the comment. */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day ( e.g. 01/31/2017 ) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** Parent comment ID of current comment. */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** The approval status of the comment */
  readonly status?: InputMaybe<CommentStatusEnum>;
  /** Type of comment. */
  readonly type?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createMediaItem mutation. */
export type CreateMediaItemInput = {
  /** Alternative text to display when mediaItem is not displayed */
  readonly altText?: InputMaybe<Scalars['String']['input']>;
  /** The userId to assign as the author of the mediaItem */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** The caption for the mediaItem */
  readonly caption?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the mediaItem */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The date of the mediaItem */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The date (in GMT zone) of the mediaItem */
  readonly dateGmt?: InputMaybe<Scalars['String']['input']>;
  /** Description of the mediaItem */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The file name of the mediaItem */
  readonly filePath?: InputMaybe<Scalars['String']['input']>;
  /** The file type of the mediaItem */
  readonly fileType?: InputMaybe<MimeTypeEnum>;
  /** The ID of the parent object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** The ping status for the mediaItem */
  readonly pingStatus?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the mediaItem */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the mediaItem */
  readonly status?: InputMaybe<MediaItemStatusEnum>;
  /** The title of the mediaItem */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createPage mutation. */
export type CreatePageInput = {
  /** The userId to assign as the author of the object */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the object */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the parent object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the page and SiteScopes */
  readonly siteScopes?: InputMaybe<PageSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createPostFormat mutation. */
export type CreatePostFormatInput = {
  /** The slug that the post_format will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the post_format object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the post_format object to mutate */
  readonly name: Scalars['String']['input'];
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createPost mutation. */
export type CreatePostInput = {
  /** The userId to assign as the author of the object */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** Set connections between the post and categories */
  readonly categories?: InputMaybe<PostCategoriesInput>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the object */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** The ping status for the object */
  readonly pingStatus?: InputMaybe<Scalars['String']['input']>;
  /** URLs that have been pinged. */
  readonly pinged?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Set connections between the post and postFormats */
  readonly postFormats?: InputMaybe<PostPostFormatsInput>;
  /** Set connections between the post and SiteScopes */
  readonly siteScopes?: InputMaybe<PostSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Set connections between the post and tags */
  readonly tags?: InputMaybe<PostTagsInput>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
  /** URLs queued to be pinged. */
  readonly toPing?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Input for the createProductFamily mutation. */
export type CreateProductFamilyInput = {
  /** The slug that the product_family will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the product_family object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the product_family object to mutate */
  readonly name: Scalars['String']['input'];
  /** The database ID of the product_family that should be set as the parent. This field cannot be used in conjunction with parentId */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the product_family that should be set as the parent. This field cannot be used in conjunction with parentDatabaseId */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createSiteScope mutation. */
export type CreateSiteScopeInput = {
  /** The slug that the site_scope will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the site_scope object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the site_scope object to mutate */
  readonly name: Scalars['String']['input'];
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTag mutation. */
export type CreateTagInput = {
  /** The slug that the post_tag will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the post_tag object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The name of the post_tag object to mutate */
  readonly name: Scalars['String']['input'];
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Application mutation. */
export type CreateTio2ApplicationInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Application and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2ApplicationSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Document mutation. */
export type CreateTio2DocumentInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Document and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2DocumentSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Faq mutation. */
export type CreateTio2FaqInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Faq and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2FaqSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Grade mutation. */
export type CreateTio2GradeInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Grade and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2GradeSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Homepage mutation. */
export type CreateTio2HomepageInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Homepage and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2HomepageSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createTio2Product mutation. */
export type CreateTio2ProductInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Product and ProductFamilies */
  readonly productFamilies?: InputMaybe<Tio2ProductProductFamiliesInput>;
  /** Set connections between the Tio2Product and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2ProductSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the createUser mutation. */
export type CreateUserInput = {
  /** User's AOL IM account. */
  readonly aim?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** A string containing content about the user. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** A string that will be shown on the site. Defaults to user's username. It is likely that you will want to change this, for both appearance and security through obscurity (that is if you dont use and delete the default admin user). */
  readonly displayName?: InputMaybe<Scalars['String']['input']>;
  /** A string containing the user's email address. */
  readonly email?: InputMaybe<Scalars['String']['input']>;
  /** The user's first name. */
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's Jabber account. */
  readonly jabber?: InputMaybe<Scalars['String']['input']>;
  /** The user's last name. */
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale. */
  readonly locale?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains a URL-friendly name for the user. The default is the user's username. */
  readonly nicename?: InputMaybe<Scalars['String']['input']>;
  /** The user's nickname, defaults to the user's username. */
  readonly nickname?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains the plain text password for the user. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** The date the user registered. Format is Y-m-d H:i:s. */
  readonly registered?: InputMaybe<Scalars['String']['input']>;
  /** A string for whether to enable the rich editor or not. False if not empty. */
  readonly richEditing?: InputMaybe<Scalars['String']['input']>;
  /** An array of roles to be assigned to the user. */
  readonly roles?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** A string that contains the user's username for logging in. */
  readonly username: Scalars['String']['input'];
  /** A string containing the user's URL for the user's web site. */
  readonly websiteUrl?: InputMaybe<Scalars['String']['input']>;
  /** User's Yahoo IM account. */
  readonly yim?: InputMaybe<Scalars['String']['input']>;
};

/** Date values */
export type DateInput = {
  /** Day of the month (from 1 to 31) */
  readonly day?: InputMaybe<Scalars['Int']['input']>;
  /** Hour of the day (from 0 to 23) */
  readonly hour?: InputMaybe<Scalars['Int']['input']>;
  /** Minute of the hour (from 0 to 59) */
  readonly minute?: InputMaybe<Scalars['Int']['input']>;
  /** Month number (from 1 to 12) */
  readonly month?: InputMaybe<Scalars['Int']['input']>;
  /** Second of the minute (from 0 to 59) */
  readonly second?: InputMaybe<Scalars['Int']['input']>;
  /** 4 digit year (e.g. 2017) */
  readonly year?: InputMaybe<Scalars['Int']['input']>;
};

/** Filter the connection based on input */
export type DateQueryInput = {
  /** Nodes should be returned after this date */
  readonly after?: InputMaybe<DateInput>;
  /** Nodes should be returned before this date */
  readonly before?: InputMaybe<DateInput>;
  /** Column to query against */
  readonly column?: InputMaybe<PostObjectsConnectionDateColumnEnum>;
  /** For after/before, whether exact value should be matched or not */
  readonly compare?: InputMaybe<Scalars['String']['input']>;
  /** Day of the month (from 1 to 31) */
  readonly day?: InputMaybe<Scalars['Int']['input']>;
  /** Hour (from 0 to 23) */
  readonly hour?: InputMaybe<Scalars['Int']['input']>;
  /** For after/before, whether exact value should be matched or not */
  readonly inclusive?: InputMaybe<Scalars['Boolean']['input']>;
  /** Minute (from 0 to 59) */
  readonly minute?: InputMaybe<Scalars['Int']['input']>;
  /** Month number (from 1 to 12) */
  readonly month?: InputMaybe<Scalars['Int']['input']>;
  /** OR or AND, how the sub-arrays should be compared */
  readonly relation?: InputMaybe<RelationEnum>;
  /** Second (0 to 59) */
  readonly second?: InputMaybe<Scalars['Int']['input']>;
  /** Week of the year (from 0 to 53) */
  readonly week?: InputMaybe<Scalars['Int']['input']>;
  /** 4 digit year (e.g. 2017) */
  readonly year?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for the deleteCategory mutation. */
export type DeleteCategoryInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the category to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deleteComment mutation. */
export type DeleteCommentInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the comment should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The deleted comment ID */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deleteMediaItem mutation. */
export type DeleteMediaItemInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the mediaItem should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the mediaItem to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deletePage mutation. */
export type DeletePageInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the page to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deletePostFormat mutation. */
export type DeletePostFormatInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the postFormat to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deletePost mutation. */
export type DeletePostInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the post to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteProductFamily mutation. */
export type DeleteProductFamilyInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the ProductFamily to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deleteSiteScope mutation. */
export type DeleteSiteScopeInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deleteTag mutation. */
export type DeleteTagInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag to delete */
  readonly id: Scalars['ID']['input'];
};

/** Input for the deleteTio2Application mutation. */
export type DeleteTio2ApplicationInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Application to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteTio2Document mutation. */
export type DeleteTio2DocumentInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Document to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteTio2Faq mutation. */
export type DeleteTio2FaqInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Faq to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteTio2Grade mutation. */
export type DeleteTio2GradeInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Grade to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteTio2Homepage mutation. */
export type DeleteTio2HomepageInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Homepage to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteTio2Product mutation. */
export type DeleteTio2ProductInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Whether the object should be force deleted instead of being moved to the trash */
  readonly forceDelete?: InputMaybe<Scalars['Boolean']['input']>;
  /** The ID of the Tio2Product to delete */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the deleteUser mutation. */
export type DeleteUserInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the user you want to delete */
  readonly id: Scalars['ID']['input'];
  /** Reassign posts and links to new User ID. */
  readonly reassignId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the HierarchicalContentNodeToContentNodeAncestorsConnection connection */
export type HierarchicalContentNodeToContentNodeAncestorsConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the HierarchicalContentNodeToContentNodeChildrenConnection connection */
export type HierarchicalContentNodeToContentNodeChildrenConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific MediaItem. Specifies which unique attribute is used to find an exact MediaItem. */
export type MediaItemIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a media item by its source url */
  | 'SOURCE_URL'
  /** Identify a resource by the URI. */
  | 'URI';

/** Predefined image size variations. Represents the standard image dimensions available for media assets. */
export type MediaItemSizeEnum =
  /** Large image preview suitable for detail views. (1024x1024) */
  | 'LARGE'
  /** Medium image preview typically suitable for listings and detail views. (300x300) */
  | 'MEDIUM'
  /** Medium-to-large image preview suitable for listings and detail views. (768x0) */
  | 'MEDIUM_LARGE'
  /** Small image preview suitable for thumbnails and listings. (150x150) */
  | 'THUMBNAIL'
  /** Custom Image Size. (1536x1536) */
  | '_1536X1536'
  /** Custom Image Size. (2048x2048) */
  | '_2048X2048';

/** Publication status for media items. Controls whether media is publicly accessible, private, or in another state. */
export type MediaItemStatusEnum =
  /** Automatically created media that has not been finalized */
  | 'AUTO_DRAFT'
  /** Media that inherits its publication status from the parent content */
  | 'INHERIT'
  /** Media visible only to users with appropriate permissions */
  | 'PRIVATE'
  /** Media marked for deletion but still recoverable */
  | 'TRASH';

/** Arguments for filtering the MediaItemToCommentConnection connection */
export type MediaItemToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Identifier types for retrieving a specific menu item. Determines whether to look up menu items by global ID or database ID. */
export type MenuItemNodeIdTypeEnum =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID';

/** Arguments for filtering the MenuItemToMenuItemConnection connection */
export type MenuItemToMenuItemConnectionWhereArgs = {
  /** The database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** The menu location for the menu being queried */
  readonly location?: InputMaybe<MenuLocationEnum>;
  /** The database ID of the parent menu object */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the parent menu object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Designated areas where navigation menus can be displayed. Represents the named regions in the interface where menus can be assigned. */
export type MenuLocationEnum =
  /** Empty menu location */
  | 'EMPTY';

/** Identifier types for retrieving a specific navigation menu. Specifies which property (ID, name, location) is used to locate a particular menu. */
export type MenuNodeIdTypeEnum =
  /** Identify a menu node by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a menu node by the (hashed) Global ID. */
  | 'ID'
  /** Identify a menu node by the slug of menu location to which it is assigned */
  | 'LOCATION'
  /** Identify a menu node by its name */
  | 'NAME'
  /** Identify a menu node by its slug */
  | 'SLUG';

/** Arguments for filtering the MenuToMenuItemConnection connection */
export type MenuToMenuItemConnectionWhereArgs = {
  /** The database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** The menu location for the menu being queried */
  readonly location?: InputMaybe<MenuLocationEnum>;
  /** The database ID of the parent menu object */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the parent menu object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Media file type classification based on MIME standards. Used to identify and filter media items by their format and content type. */
export type MimeTypeEnum =
  /** application/java mime type. */
  | 'APPLICATION_JAVA'
  /** application/msword mime type. */
  | 'APPLICATION_MSWORD'
  /** application/octet-stream mime type. */
  | 'APPLICATION_OCTET_STREAM'
  /** application/onenote mime type. */
  | 'APPLICATION_ONENOTE'
  /** application/oxps mime type. */
  | 'APPLICATION_OXPS'
  /** application/pdf mime type. */
  | 'APPLICATION_PDF'
  /** application/rar mime type. */
  | 'APPLICATION_RAR'
  /** application/rtf mime type. */
  | 'APPLICATION_RTF'
  /** application/ttaf+xml mime type. */
  | 'APPLICATION_TTAF_XML'
  /** application/vnd.apple.keynote mime type. */
  | 'APPLICATION_VND_APPLE_KEYNOTE'
  /** application/vnd.apple.numbers mime type. */
  | 'APPLICATION_VND_APPLE_NUMBERS'
  /** application/vnd.apple.pages mime type. */
  | 'APPLICATION_VND_APPLE_PAGES'
  /** application/vnd.ms-access mime type. */
  | 'APPLICATION_VND_MS_ACCESS'
  /** application/vnd.ms-excel mime type. */
  | 'APPLICATION_VND_MS_EXCEL'
  /** application/vnd.ms-excel.addin.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_EXCEL_ADDIN_MACROENABLED_12'
  /** application/vnd.ms-excel.sheet.binary.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_EXCEL_SHEET_BINARY_MACROENABLED_12'
  /** application/vnd.ms-excel.sheet.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_EXCEL_SHEET_MACROENABLED_12'
  /** application/vnd.ms-excel.template.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_EXCEL_TEMPLATE_MACROENABLED_12'
  /** application/vnd.ms-powerpoint mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT'
  /** application/vnd.ms-powerpoint.addin.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT_ADDIN_MACROENABLED_12'
  /** application/vnd.ms-powerpoint.presentation.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT_PRESENTATION_MACROENABLED_12'
  /** application/vnd.ms-powerpoint.slideshow.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT_SLIDESHOW_MACROENABLED_12'
  /** application/vnd.ms-powerpoint.slide.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT_SLIDE_MACROENABLED_12'
  /** application/vnd.ms-powerpoint.template.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_POWERPOINT_TEMPLATE_MACROENABLED_12'
  /** application/vnd.ms-project mime type. */
  | 'APPLICATION_VND_MS_PROJECT'
  /** application/vnd.ms-word.document.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_WORD_DOCUMENT_MACROENABLED_12'
  /** application/vnd.ms-word.template.macroEnabled.12 mime type. */
  | 'APPLICATION_VND_MS_WORD_TEMPLATE_MACROENABLED_12'
  /** application/vnd.ms-write mime type. */
  | 'APPLICATION_VND_MS_WRITE'
  /** application/vnd.ms-xpsdocument mime type. */
  | 'APPLICATION_VND_MS_XPSDOCUMENT'
  /** application/vnd.oasis.opendocument.chart mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_CHART'
  /** application/vnd.oasis.opendocument.database mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_DATABASE'
  /** application/vnd.oasis.opendocument.formula mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_FORMULA'
  /** application/vnd.oasis.opendocument.graphics mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_GRAPHICS'
  /** application/vnd.oasis.opendocument.presentation mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_PRESENTATION'
  /** application/vnd.oasis.opendocument.spreadsheet mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_SPREADSHEET'
  /** application/vnd.oasis.opendocument.text mime type. */
  | 'APPLICATION_VND_OASIS_OPENDOCUMENT_TEXT'
  /** application/vnd.openxmlformats-officedocument.presentationml.presentation mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_PRESENTATION'
  /** application/vnd.openxmlformats-officedocument.presentationml.slide mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_SLIDE'
  /** application/vnd.openxmlformats-officedocument.presentationml.slideshow mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_SLIDESHOW'
  /** application/vnd.openxmlformats-officedocument.presentationml.template mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_PRESENTATIONML_TEMPLATE'
  /** application/vnd.openxmlformats-officedocument.spreadsheetml.sheet mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_SPREADSHEETML_SHEET'
  /** application/vnd.openxmlformats-officedocument.spreadsheetml.template mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_SPREADSHEETML_TEMPLATE'
  /** application/vnd.openxmlformats-officedocument.wordprocessingml.document mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_DOCUMENT'
  /** application/vnd.openxmlformats-officedocument.wordprocessingml.template mime type. */
  | 'APPLICATION_VND_OPENXMLFORMATS_OFFICEDOCUMENT_WORDPROCESSINGML_TEMPLATE'
  /** application/wordperfect mime type. */
  | 'APPLICATION_WORDPERFECT'
  /** application/x-7z-compressed mime type. */
  | 'APPLICATION_X_7Z_COMPRESSED'
  /** application/x-gzip mime type. */
  | 'APPLICATION_X_GZIP'
  /** application/x-tar mime type. */
  | 'APPLICATION_X_TAR'
  /** application/zip mime type. */
  | 'APPLICATION_ZIP'
  /** audio/aac mime type. */
  | 'AUDIO_AAC'
  /** audio/flac mime type. */
  | 'AUDIO_FLAC'
  /** audio/midi mime type. */
  | 'AUDIO_MIDI'
  /** audio/mpeg mime type. */
  | 'AUDIO_MPEG'
  /** audio/ogg mime type. */
  | 'AUDIO_OGG'
  /** audio/wav mime type. */
  | 'AUDIO_WAV'
  /** audio/x-matroska mime type. */
  | 'AUDIO_X_MATROSKA'
  /** audio/x-ms-wax mime type. */
  | 'AUDIO_X_MS_WAX'
  /** audio/x-ms-wma mime type. */
  | 'AUDIO_X_MS_WMA'
  /** audio/x-realaudio mime type. */
  | 'AUDIO_X_REALAUDIO'
  /** image/avif mime type. */
  | 'IMAGE_AVIF'
  /** image/bmp mime type. */
  | 'IMAGE_BMP'
  /** image/gif mime type. */
  | 'IMAGE_GIF'
  /** image/heic mime type. */
  | 'IMAGE_HEIC'
  /** image/heic-sequence mime type. */
  | 'IMAGE_HEIC_SEQUENCE'
  /** image/heif mime type. */
  | 'IMAGE_HEIF'
  /** image/heif-sequence mime type. */
  | 'IMAGE_HEIF_SEQUENCE'
  /** image/jpeg mime type. */
  | 'IMAGE_JPEG'
  /** image/png mime type. */
  | 'IMAGE_PNG'
  /** image/tiff mime type. */
  | 'IMAGE_TIFF'
  /** image/webp mime type. */
  | 'IMAGE_WEBP'
  /** image/x-icon mime type. */
  | 'IMAGE_X_ICON'
  /** text/calendar mime type. */
  | 'TEXT_CALENDAR'
  /** text/css mime type. */
  | 'TEXT_CSS'
  /** text/csv mime type. */
  | 'TEXT_CSV'
  /** text/plain mime type. */
  | 'TEXT_PLAIN'
  /** text/richtext mime type. */
  | 'TEXT_RICHTEXT'
  /** text/tab-separated-values mime type. */
  | 'TEXT_TAB_SEPARATED_VALUES'
  /** text/vtt mime type. */
  | 'TEXT_VTT'
  /** video/3gpp mime type. */
  | 'VIDEO_3GPP'
  /** video/3gpp2 mime type. */
  | 'VIDEO_3GPP2'
  /** video/avi mime type. */
  | 'VIDEO_AVI'
  /** video/divx mime type. */
  | 'VIDEO_DIVX'
  /** video/mp4 mime type. */
  | 'VIDEO_MP4'
  /** video/mpeg mime type. */
  | 'VIDEO_MPEG'
  /** video/ogg mime type. */
  | 'VIDEO_OGG'
  /** video/quicktime mime type. */
  | 'VIDEO_QUICKTIME'
  /** video/webm mime type. */
  | 'VIDEO_WEBM'
  /** video/x-flv mime type. */
  | 'VIDEO_X_FLV'
  /** video/x-matroska mime type. */
  | 'VIDEO_X_MATROSKA'
  /** video/x-ms-asf mime type. */
  | 'VIDEO_X_MS_ASF'
  /** video/x-ms-wm mime type. */
  | 'VIDEO_X_MS_WM'
  /** video/x-ms-wmv mime type. */
  | 'VIDEO_X_MS_WMV'
  /** video/x-ms-wmx mime type. */
  | 'VIDEO_X_MS_WMX';

/** Sort direction for ordered results. Determines whether items are returned in ascending or descending order. */
export type OrderEnum =
  /** Results ordered from lowest to highest values (i.e. A-Z, oldest-newest) */
  | 'ASC'
  /** Results ordered from highest to lowest values (i.e. Z-A, newest-oldest) */
  | 'DESC';

/** Identifier types for retrieving a specific Page. Specifies which unique attribute is used to find an exact Page. */
export type PageIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the page to SiteScopes */
export type PageSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<PageSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the page to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type PageSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the page. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the PageToCommentConnection connection */
export type PageToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the PageToRevisionConnection connection */
export type PageToRevisionConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the PageToSiteScopeConnection connection */
export type PageToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the PageToTermNodeConnection connection */
export type PageToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Operational status of a plugin. Indicates whether a plugin is active, inactive, or in another state that affects its functionality. */
export type PluginStatusEnum =
  /** The plugin is currently active. */
  | 'ACTIVE'
  /** The plugin is a drop-in plugin. */
  | 'DROP_IN'
  /** The plugin is currently inactive. */
  | 'INACTIVE'
  /** The plugin is a must-use plugin. */
  | 'MUST_USE'
  /** The plugin is technically active but was paused while loading. */
  | 'PAUSED'
  /** The plugin was active recently. */
  | 'RECENTLY_ACTIVE'
  /** The plugin has an upgrade available. */
  | 'UPGRADE';

/** Set relationships between the post to categories */
export type PostCategoriesInput = {
  /** If true, this will append the category to existing related categories. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<PostCategoriesNodeInput>>>;
};

/** List of categories to connect the post to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type PostCategoriesNodeInput = {
  /** The description of the category. This field is used to set a description of the category if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the category. If present, this will be used to connect to the post. If no existing category exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the category. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the category. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific PostFormat. Determines which unique property (global ID, database ID, slug, etc.) is used to locate the PostFormat. */
export type PostFormatIdType =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the PostFormatToContentNodeConnection connection */
export type PostFormatToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypesOfPostFormatEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the PostFormatToPostConnection connection */
export type PostFormatToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific Post. Specifies which unique attribute is used to find an exact Post. */
export type PostIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Content field rendering options. Determines whether content fields are returned as raw data or with applied formatting and transformations. Default is RENDERED. */
export type PostObjectFieldFormatEnum =
  /** Unprocessed content exactly as stored in the database, requires appropriate permissions. */
  | 'RAW'
  /** Content with all formatting and transformations applied, ready for display. */
  | 'RENDERED';

/** Date field selectors for content filtering. Specifies which date attribute (creation date, modification date) should be used for date-based queries. */
export type PostObjectsConnectionDateColumnEnum =
  /** The date the comment was created in local time. */
  | 'DATE'
  /** The most recent modification date of the comment. */
  | 'MODIFIED';

/** Content sorting attributes for post-type objects. Identifies which content property should be used to determine result order. */
export type PostObjectsConnectionOrderbyEnum =
  /** Ordering by content author (typically by author name). */
  | 'AUTHOR'
  /** Ordering by popularity based on number of comments. */
  | 'COMMENT_COUNT'
  /** Chronological ordering by publication date. */
  | 'DATE'
  /** Maintain custom order of IDs exactly as specified in the query with the IN field. */
  | 'IN'
  /** Ordering by manually defined sort position. */
  | 'MENU_ORDER'
  /** Chronological ordering by modified date. */
  | 'MODIFIED'
  /** Maintain custom order of IDs exactly as specified in the query with the NAME_IN field. */
  | 'NAME_IN'
  /** Ordering by parent-child relationship in hierarchical content. */
  | 'PARENT'
  /** Alphabetical ordering by URL-friendly name. */
  | 'SLUG'
  /** Alphabetical ordering by content title */
  | 'TITLE';

/** Options for ordering the connection */
export type PostObjectsConnectionOrderbyInput = {
  /** The field to order the connection by */
  readonly field: PostObjectsConnectionOrderbyEnum;
  /** Possible directions in which to order a list of items */
  readonly order: OrderEnum;
};

/** Set relationships between the post to postFormats */
export type PostPostFormatsInput = {
  /** If true, this will append the postFormat to existing related postFormats. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<PostPostFormatsNodeInput>>>;
};

/** List of postFormats to connect the post to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type PostPostFormatsNodeInput = {
  /** The description of the postFormat. This field is used to set a description of the postFormat if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the postFormat. If present, this will be used to connect to the post. If no existing postFormat exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the postFormat. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the postFormat. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Set relationships between the post to SiteScopes */
export type PostSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<PostSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the post to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type PostSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the post. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Publishing status that controls the visibility and editorial state of content. Determines whether content is published, pending review, in draft state, or private. */
export type PostStatusEnum =
  /** Objects with the acf-disabled status */
  | 'ACF_DISABLED'
  /** Automatically saved content that has not been manually saved */
  | 'AUTO_DRAFT'
  /** Content that is saved but not yet published or visible to the public */
  | 'DRAFT'
  /** Objects with the future status */
  | 'FUTURE'
  /** Content that inherits its status from a parent object */
  | 'INHERIT'
  /** Content awaiting review before publication */
  | 'PENDING'
  /** Content only visible to authorized users with appropriate permissions */
  | 'PRIVATE'
  /** Content that is publicly visible to all visitors */
  | 'PUBLISH'
  /** Objects with the request-completed status */
  | 'REQUEST_COMPLETED'
  /** Objects with the request-confirmed status */
  | 'REQUEST_CONFIRMED'
  /** Objects with the request-failed status */
  | 'REQUEST_FAILED'
  /** Objects with the request-pending status */
  | 'REQUEST_PENDING'
  /** Content marked for deletion but still recoverable */
  | 'TRASH';

/** Set relationships between the post to tags */
export type PostTagsInput = {
  /** If true, this will append the tag to existing related tags. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<PostTagsNodeInput>>>;
};

/** List of tags to connect the post to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type PostTagsNodeInput = {
  /** The description of the tag. This field is used to set a description of the tag if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag. If present, this will be used to connect to the post. If no existing tag exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the tag. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the tag. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the PostToCategoryConnection connection */
export type PostToCategoryConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the PostToCommentConnection connection */
export type PostToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the PostToPostFormatConnection connection */
export type PostToPostFormatConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the PostToRevisionConnection connection */
export type PostToRevisionConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the PostToSiteScopeConnection connection */
export type PostToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the PostToTagConnection connection */
export type PostToTagConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the PostToTermNodeConnection connection */
export type PostToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific ProductFamily. Determines which unique property (global ID, database ID, slug, etc.) is used to locate the ProductFamily. */
export type ProductFamilyIdType =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the ProductFamilyToContentNodeConnection connection */
export type ProductFamilyToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypesOfProductFamilyEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the ProductFamilyToProductFamilyConnection connection */
export type ProductFamilyToProductFamilyConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the ProductFamilyToTio2ProductConnection connection */
export type ProductFamilyToTio2ProductConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the registerUser mutation. */
export type RegisterUserInput = {
  /** User's AOL IM account. */
  readonly aim?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** A string containing content about the user. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** A string that will be shown on the site. Defaults to user's username. It is likely that you will want to change this, for both appearance and security through obscurity (that is if you dont use and delete the default admin user). */
  readonly displayName?: InputMaybe<Scalars['String']['input']>;
  /** A string containing the user's email address. */
  readonly email?: InputMaybe<Scalars['String']['input']>;
  /** The user's first name. */
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  /** User's Jabber account. */
  readonly jabber?: InputMaybe<Scalars['String']['input']>;
  /** The user's last name. */
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale. */
  readonly locale?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains a URL-friendly name for the user. The default is the user's username. */
  readonly nicename?: InputMaybe<Scalars['String']['input']>;
  /** The user's nickname, defaults to the user's username. */
  readonly nickname?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains the plain text password for the user. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** The date the user registered. Format is Y-m-d H:i:s. */
  readonly registered?: InputMaybe<Scalars['String']['input']>;
  /** A string for whether to enable the rich editor or not. False if not empty. */
  readonly richEditing?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains the user's username. */
  readonly username: Scalars['String']['input'];
  /** A string containing the user's URL for the user's web site. */
  readonly websiteUrl?: InputMaybe<Scalars['String']['input']>;
  /** User's Yahoo IM account. */
  readonly yim?: InputMaybe<Scalars['String']['input']>;
};

/** Logical operators for filter conditions. Determines whether multiple filtering criteria should be combined with AND (all must match) or OR (any can match). */
export type RelationEnum =
  /** All conditions must match (more restrictive filtering) */
  | 'AND'
  /** Any condition can match (more inclusive filtering) */
  | 'OR';

/** Input for the resetUserPassword mutation. */
export type ResetUserPasswordInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Password reset key */
  readonly key?: InputMaybe<Scalars['String']['input']>;
  /** The user's login (username). */
  readonly login?: InputMaybe<Scalars['String']['input']>;
  /** The new password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the restoreComment mutation. */
export type RestoreCommentInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the comment to be restored */
  readonly id: Scalars['ID']['input'];
};

/** Arguments for filtering the RootQueryToCategoryConnection connection */
export type RootQueryToCategoryConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToCommentConnection connection */
export type RootQueryToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the RootQueryToContentNodeConnection connection */
export type RootQueryToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToEnqueuedScriptConnection connection */
export type RootQueryToEnqueuedScriptConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the RootQueryToEnqueuedStylesheetConnection connection */
export type RootQueryToEnqueuedStylesheetConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the RootQueryToMediaItemConnection connection */
export type RootQueryToMediaItemConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToMenuConnection connection */
export type RootQueryToMenuConnectionWhereArgs = {
  /** The database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** The menu location for the menu being queried */
  readonly location?: InputMaybe<MenuLocationEnum>;
  /** The slug of the menu to query items for */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToMenuItemConnection connection */
export type RootQueryToMenuItemConnectionWhereArgs = {
  /** The database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** The menu location for the menu being queried */
  readonly location?: InputMaybe<MenuLocationEnum>;
  /** The database ID of the parent menu object */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the parent menu object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the RootQueryToPageConnection connection */
export type RootQueryToPageConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToPluginConnection connection */
export type RootQueryToPluginConnectionWhereArgs = {
  /** Show plugin based on a keyword search. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve plugins where plugin status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PluginStatusEnum>>>;
  /** Show plugins with a specific status. */
  readonly status?: InputMaybe<PluginStatusEnum>;
};

/** Arguments for filtering the RootQueryToPostConnection connection */
export type RootQueryToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToPostFormatConnection connection */
export type RootQueryToPostFormatConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToProductFamilyConnection connection */
export type RootQueryToProductFamilyConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToRevisionsConnection connection */
export type RootQueryToRevisionsConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToSiteScopeConnection connection */
export type RootQueryToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToTagConnection connection */
export type RootQueryToTagConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToTermNodeConnection connection */
export type RootQueryToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the RootQueryToTio2ApplicationConnection connection */
export type RootQueryToTio2ApplicationConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToTio2DocumentConnection connection */
export type RootQueryToTio2DocumentConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToTio2FaqConnection connection */
export type RootQueryToTio2FaqConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToTio2GradeConnection connection */
export type RootQueryToTio2GradeConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToTio2HomepageConnection connection */
export type RootQueryToTio2HomepageConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToTio2ProductConnection connection */
export type RootQueryToTio2ProductConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the RootQueryToUserConnection connection */
export type RootQueryToUserConnectionWhereArgs = {
  /** Array of userIds to exclude. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['Int']['input']>>>;
  /** Pass an array of post types to filter results to users who have published posts in those post types. */
  readonly hasPublishedPosts?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of userIds to include. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['Int']['input']>>>;
  /** The user login. */
  readonly login?: InputMaybe<Scalars['String']['input']>;
  /** An array of logins to include. Users matching one of these logins will be included in results. */
  readonly loginIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** An array of logins to exclude. Users matching one of these logins will not be included in results. */
  readonly loginNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The user nicename. */
  readonly nicename?: InputMaybe<Scalars['String']['input']>;
  /** An array of nicenames to include. Users matching one of these nicenames will be included in results. */
  readonly nicenameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** An array of nicenames to exclude. Users matching one of these nicenames will not be included in results. */
  readonly nicenameNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<UsersConnectionOrderbyInput>>>;
  /** An array of role names that users must match to be included in results. Note that this is an inclusive list: users must match *each* role. */
  readonly role?: InputMaybe<UserRoleEnum>;
  /** An array of role names. Matched users must have at least one of these roles. */
  readonly roleIn?: InputMaybe<ReadonlyArray<InputMaybe<UserRoleEnum>>>;
  /** An array of role names to exclude. Users matching one or more of these roles will not be included in results. */
  readonly roleNotIn?: InputMaybe<ReadonlyArray<InputMaybe<UserRoleEnum>>>;
  /** Search keyword. Searches for possible string matches on columns. When "searchColumns" is left empty, it tries to determine which column to search in based on search string. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of column names to be searched. Accepts 'ID', 'login', 'nicename', 'email', 'url'. */
  readonly searchColumns?: InputMaybe<ReadonlyArray<InputMaybe<UsersConnectionSearchColumnEnum>>>;
};

/** Types of cards */
export type SeoCardType =
  | 'summary'
  | 'summary_large_image';

/** Script insertion positions in the document structure. Determines whether scripts are placed in the document head or before the closing body tag. */
export type ScriptLoadingGroupLocationEnum =
  /** Delayed loading at end of document, right before the closing `<body>` tag. (allows content to render first) */
  | 'FOOTER'
  /** Early loading in document `<head>` tag. (executes before page content renders) */
  | 'HEADER';

/** Script loading optimization attributes. Controls browser behavior for script loading to improve page performance (async or defer). */
export type ScriptLoadingStrategyEnum =
  /** Load script in parallel with page rendering, executing as soon as downloaded */
  | 'ASYNC'
  /** Download script in parallel but defer execution until page is fully parsed */
  | 'DEFER';

/** Input for the sendPasswordResetEmail mutation. */
export type SendPasswordResetEmailInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains the user's username or email address. */
  readonly username: Scalars['String']['input'];
};

/** Identifier types for retrieving a specific SiteScope. Determines which unique property (global ID, database ID, slug, etc.) is used to locate the SiteScope. */
export type SiteScopeIdType =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the SiteScopeToContentNodeConnection connection */
export type SiteScopeToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypesOfSiteScopeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToPageConnection connection */
export type SiteScopeToPageConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToPostConnection connection */
export type SiteScopeToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2ApplicationConnection connection */
export type SiteScopeToTio2ApplicationConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2DocumentConnection connection */
export type SiteScopeToTio2DocumentConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2FaqConnection connection */
export type SiteScopeToTio2FaqConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2GradeConnection connection */
export type SiteScopeToTio2GradeConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2HomepageConnection connection */
export type SiteScopeToTio2HomepageConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the SiteScopeToTio2ProductConnection connection */
export type SiteScopeToTio2ProductConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific Tag. Determines which unique property (global ID, database ID, slug, etc.) is used to locate the Tag. */
export type TagIdType =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the TagToContentNodeConnection connection */
export type TagToContentNodeConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypesOfTagEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the TagToPostConnection connection */
export type TagToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Available classification systems for organizing content. Identifies the different taxonomy types that can be used for content categorization. */
export type TaxonomyEnum =
  /** Taxonomy enum category */
  | 'CATEGORY'
  /** Taxonomy enum post_format */
  | 'POSTFORMAT'
  /** Taxonomy enum product_family */
  | 'PRODUCTFAMILY'
  /** Taxonomy enum site_scope */
  | 'SITESCOPE'
  /** Taxonomy enum post_tag */
  | 'TAG';

/** Identifier types for retrieving a taxonomy definition. Determines whether to look up taxonomies by ID or name. */
export type TaxonomyIdTypeEnum =
  /** The globally unique ID */
  | 'ID'
  /** The name of the taxonomy */
  | 'NAME';

/** The Type of Identifier used to fetch a single resource. Default is "ID". To be used along with the "id" field. */
export type TermNodeIdTypeEnum =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The hashed Global ID */
  | 'ID'
  /** The name of the node */
  | 'NAME'
  /** Url friendly name of the node */
  | 'SLUG'
  /** The URI for the node */
  | 'URI';

/** Arguments for filtering the TermNodeToEnqueuedScriptConnection connection */
export type TermNodeToEnqueuedScriptConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the TermNodeToEnqueuedStylesheetConnection connection */
export type TermNodeToEnqueuedStylesheetConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Sorting attributes for taxonomy term collections. Determines which property of taxonomy terms is used for ordering results. */
export type TermObjectsConnectionOrderbyEnum =
  /** Ordering by number of associated content items. */
  | 'COUNT'
  /** Alphabetical ordering by term description text. */
  | 'DESCRIPTION'
  /** Alphabetical ordering by term name. */
  | 'NAME'
  /** Alphabetical ordering by URL-friendly name. */
  | 'SLUG'
  /** Ordering by assigned term grouping value. */
  | 'TERM_GROUP'
  /** Ordering by internal identifier. */
  | 'TERM_ID'
  /** Ordering by manually defined sort position. */
  | 'TERM_ORDER';

/** Identifier types for retrieving a specific Tio2Application. Specifies which unique attribute is used to find an exact Tio2Application. */
export type Tio2ApplicationIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Application to SiteScopes */
export type Tio2ApplicationSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2ApplicationSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Application to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2ApplicationSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Application. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2ApplicationToRevisionConnection connection */
export type Tio2ApplicationToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2ApplicationToSiteScopeConnection connection */
export type Tio2ApplicationToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2ApplicationToTermNodeConnection connection */
export type Tio2ApplicationToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific Tio2Document. Specifies which unique attribute is used to find an exact Tio2Document. */
export type Tio2DocumentIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Document to SiteScopes */
export type Tio2DocumentSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2DocumentSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Document to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2DocumentSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Document. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2DocumentToRevisionConnection connection */
export type Tio2DocumentToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2DocumentToSiteScopeConnection connection */
export type Tio2DocumentToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2DocumentToTermNodeConnection connection */
export type Tio2DocumentToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific Tio2Faq. Specifies which unique attribute is used to find an exact Tio2Faq. */
export type Tio2FaqIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Faq to SiteScopes */
export type Tio2FaqSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2FaqSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Faq to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2FaqSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Faq. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2FaqToRevisionConnection connection */
export type Tio2FaqToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2FaqToSiteScopeConnection connection */
export type Tio2FaqToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2FaqToTermNodeConnection connection */
export type Tio2FaqToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific Tio2Grade. Specifies which unique attribute is used to find an exact Tio2Grade. */
export type Tio2GradeIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Grade to SiteScopes */
export type Tio2GradeSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2GradeSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Grade to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2GradeSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Grade. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2GradeToRevisionConnection connection */
export type Tio2GradeToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2GradeToSiteScopeConnection connection */
export type Tio2GradeToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2GradeToTermNodeConnection connection */
export type Tio2GradeToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific Tio2Homepage. Specifies which unique attribute is used to find an exact Tio2Homepage. */
export type Tio2HomepageIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Homepage to SiteScopes */
export type Tio2HomepageSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2HomepageSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Homepage to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2HomepageSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Homepage. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2HomepageToRevisionConnection connection */
export type Tio2HomepageToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2HomepageToSiteScopeConnection connection */
export type Tio2HomepageToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2HomepageToTermNodeConnection connection */
export type Tio2HomepageToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Identifier types for retrieving a specific Tio2Product. Specifies which unique attribute is used to find an exact Tio2Product. */
export type Tio2ProductIdType =
  /** Identify a resource by the Database ID. */
  | 'DATABASE_ID'
  /** Identify a resource by the (hashed) Global ID. */
  | 'ID'
  /** Identify a resource by the slug. Available to non-hierarchcial Types where the slug is a unique identifier. */
  | 'SLUG'
  /** Identify a resource by the URI. */
  | 'URI';

/** Set relationships between the Tio2Product to ProductFamilies */
export type Tio2ProductProductFamiliesInput = {
  /** If true, this will append the ProductFamily to existing related ProductFamilies. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2ProductProductFamiliesNodeInput>>>;
};

/** List of ProductFamilies to connect the Tio2Product to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2ProductProductFamiliesNodeInput = {
  /** The description of the ProductFamily. This field is used to set a description of the ProductFamily if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the ProductFamily. If present, this will be used to connect to the Tio2Product. If no existing ProductFamily exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the ProductFamily. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the ProductFamily. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Set relationships between the Tio2Product to SiteScopes */
export type Tio2ProductSiteScopesInput = {
  /** If true, this will append the SiteScope to existing related SiteScopes. If false, this will replace existing relationships. Default true. */
  readonly append?: InputMaybe<Scalars['Boolean']['input']>;
  /** The input list of items to set. */
  readonly nodes?: InputMaybe<ReadonlyArray<InputMaybe<Tio2ProductSiteScopesNodeInput>>>;
};

/** List of SiteScopes to connect the Tio2Product to. If an ID is set, it will be used to create the connection. If not, it will look for a slug. If neither are valid existing terms, and the site is configured to allow terms to be created during post mutations, a term will be created using the Name if it exists in the input, then fallback to the slug if it exists. */
export type Tio2ProductSiteScopesNodeInput = {
  /** The description of the SiteScope. This field is used to set a description of the SiteScope if a new one is created during the mutation. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope. If present, this will be used to connect to the Tio2Product. If no existing SiteScope exists with this ID, no connection will be made. */
  readonly id?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the SiteScope. This field is used to create a new term, if term creation is enabled in nested mutations, and if one does not already exist with the provided slug or ID or if a slug or ID is not provided. If no name is included and a term is created, the creation will fallback to the slug field. */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the SiteScope. If no ID is present, this field will be used to make a connection. If no existing term exists with this slug, this field will be used as a fallback to the Name field when creating a new term to connect to, if term creation is enabled as a nested mutation. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2ProductToProductFamilyConnection connection */
export type Tio2ProductToProductFamilyConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2ProductToRevisionConnection connection */
export type Tio2ProductToRevisionConnectionWhereArgs = {
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the Tio2ProductToSiteScopeConnection connection */
export type Tio2ProductToSiteScopeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments for filtering the Tio2ProductToTermNodeConnection connection */
export type Tio2ProductToTermNodeConnectionWhereArgs = {
  /** Unique cache key to be produced when this query is stored in an object cache. Default is 'core'. */
  readonly cacheDomain?: InputMaybe<Scalars['String']['input']>;
  /** Term ID to retrieve child terms of. If multiple taxonomies are passed, $child_of is ignored. Default 0. */
  readonly childOf?: InputMaybe<Scalars['Int']['input']>;
  /** True to limit results to terms that have no children. This parameter has no effect on non-hierarchical taxonomies. Default false. */
  readonly childless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Retrieve terms where the description is LIKE the input value. Default empty. */
  readonly descriptionLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of term ids to exclude. If $include is non-empty, $exclude is ignored. Default empty array. */
  readonly exclude?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term ids to exclude along with all of their descendant terms. If $include is non-empty, $exclude_tree is ignored. Default empty array. */
  readonly excludeTree?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to hide terms not assigned to any posts. Accepts true or false. Default false */
  readonly hideEmpty?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether to include terms that have non-empty descendants (even if $hide_empty is set to true). Default true. */
  readonly hierarchical?: InputMaybe<Scalars['Boolean']['input']>;
  /** Array of term ids to include. Default empty array. */
  readonly include?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of names to return term(s) for. Default empty. */
  readonly name?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Retrieve terms where the name is LIKE the input value. Default empty. */
  readonly nameLike?: InputMaybe<Scalars['String']['input']>;
  /** Array of object IDs. Results will be limited to terms associated with these objects. */
  readonly objectIds?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Direction the connection should be ordered in */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field(s) to order terms by. Defaults to 'name'. */
  readonly orderby?: InputMaybe<TermObjectsConnectionOrderbyEnum>;
  /** Whether to pad the quantity of a term's children in the quantity of each term's "count" object variable. Default false. */
  readonly padCounts?: InputMaybe<Scalars['Boolean']['input']>;
  /** Parent term ID to retrieve direct-child terms of. Default empty. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Search criteria to match terms. Will be SQL-formatted with wildcards before and after. Default empty. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Array of slugs to return term(s) for. Default empty. */
  readonly slug?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** The Taxonomy to filter terms by */
  readonly taxonomies?: InputMaybe<ReadonlyArray<InputMaybe<TaxonomyEnum>>>;
  /**
   * Array of term taxonomy IDs, to match when querying terms.
   * @deprecated Use `termTaxonomyId` instead. This will be removed in the next major version of WPGraphQL.
   */
  readonly termTaxonomId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of term taxonomy IDs, to match when querying terms. */
  readonly termTaxonomyId?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Whether to prime meta caches for matched terms. Default true. */
  readonly updateTermMetaCache?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the updateCategory mutation. */
export type UpdateCategoryInput = {
  /** The slug that the category will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the category object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the category object to update */
  readonly id: Scalars['ID']['input'];
  /** The name of the category object to mutate */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The database ID of the category that should be set as the parent. This field cannot be used in conjunction with parentId */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the category that should be set as the parent. This field cannot be used in conjunction with parentDatabaseId */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateComment mutation. */
export type UpdateCommentInput = {
  /**
   * The approval status of the comment.
   * @deprecated Deprecated in favor of the status field
   */
  readonly approved?: InputMaybe<Scalars['String']['input']>;
  /** The name of the comment's author. */
  readonly author?: InputMaybe<Scalars['String']['input']>;
  /** The email of the comment's author. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** The url of the comment's author. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The database ID of the post object the comment belongs to. */
  readonly commentOn?: InputMaybe<Scalars['Int']['input']>;
  /** Content of the comment. */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day ( e.g. 01/31/2017 ) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the comment being updated. */
  readonly id: Scalars['ID']['input'];
  /** Parent comment ID of current comment. */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** The approval status of the comment */
  readonly status?: InputMaybe<CommentStatusEnum>;
  /** Type of comment. */
  readonly type?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateMediaItem mutation. */
export type UpdateMediaItemInput = {
  /** Alternative text to display when mediaItem is not displayed */
  readonly altText?: InputMaybe<Scalars['String']['input']>;
  /** The userId to assign as the author of the mediaItem */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** The caption for the mediaItem */
  readonly caption?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the mediaItem */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The date of the mediaItem */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The date (in GMT zone) of the mediaItem */
  readonly dateGmt?: InputMaybe<Scalars['String']['input']>;
  /** Description of the mediaItem */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The file name of the mediaItem */
  readonly filePath?: InputMaybe<Scalars['String']['input']>;
  /** The file type of the mediaItem */
  readonly fileType?: InputMaybe<MimeTypeEnum>;
  /** The ID of the mediaItem object */
  readonly id: Scalars['ID']['input'];
  /** The ID of the parent object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** The ping status for the mediaItem */
  readonly pingStatus?: InputMaybe<Scalars['String']['input']>;
  /** The slug of the mediaItem */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the mediaItem */
  readonly status?: InputMaybe<MediaItemStatusEnum>;
  /** The title of the mediaItem */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updatePage mutation. */
export type UpdatePageInput = {
  /** The userId to assign as the author of the object */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the object */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the page object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the parent object */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the page and SiteScopes */
  readonly siteScopes?: InputMaybe<PageSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updatePostFormat mutation. */
export type UpdatePostFormatInput = {
  /** The slug that the post_format will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the post_format object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the postFormat object to update */
  readonly id: Scalars['ID']['input'];
  /** The name of the post_format object to mutate */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updatePost mutation. */
export type UpdatePostInput = {
  /** The userId to assign as the author of the object */
  readonly authorId?: InputMaybe<Scalars['ID']['input']>;
  /** Set connections between the post and categories */
  readonly categories?: InputMaybe<PostCategoriesInput>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The comment status for the object */
  readonly commentStatus?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the post object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** The ping status for the object */
  readonly pingStatus?: InputMaybe<Scalars['String']['input']>;
  /** URLs that have been pinged. */
  readonly pinged?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Set connections between the post and postFormats */
  readonly postFormats?: InputMaybe<PostPostFormatsInput>;
  /** Set connections between the post and SiteScopes */
  readonly siteScopes?: InputMaybe<PostSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Set connections between the post and tags */
  readonly tags?: InputMaybe<PostTagsInput>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
  /** URLs queued to be pinged. */
  readonly toPing?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Input for the updateProductFamily mutation. */
export type UpdateProductFamilyInput = {
  /** The slug that the product_family will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the product_family object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the ProductFamily object to update */
  readonly id: Scalars['ID']['input'];
  /** The name of the product_family object to mutate */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** The database ID of the product_family that should be set as the parent. This field cannot be used in conjunction with parentId */
  readonly parentDatabaseId?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the product_family that should be set as the parent. This field cannot be used in conjunction with parentDatabaseId */
  readonly parentId?: InputMaybe<Scalars['ID']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateSettings mutation. */
export type UpdateSettingsInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** Allow people to submit comments on new posts. */
  readonly discussionSettingsDefaultCommentStatus?: InputMaybe<Scalars['String']['input']>;
  /** Allow link notifications from other blogs (pingbacks and trackbacks) on new articles. */
  readonly discussionSettingsDefaultPingStatus?: InputMaybe<Scalars['String']['input']>;
  /** A date format for all date strings. */
  readonly generalSettingsDateFormat?: InputMaybe<Scalars['String']['input']>;
  /** Site tagline. */
  readonly generalSettingsDescription?: InputMaybe<Scalars['String']['input']>;
  /** This address is used for admin purposes, like new user notification. */
  readonly generalSettingsEmail?: InputMaybe<Scalars['String']['input']>;
  /** WordPress locale code. */
  readonly generalSettingsLanguage?: InputMaybe<Scalars['String']['input']>;
  /** A day number of the week that the week should start on. */
  readonly generalSettingsStartOfWeek?: InputMaybe<Scalars['Int']['input']>;
  /** A time format for all time strings. */
  readonly generalSettingsTimeFormat?: InputMaybe<Scalars['String']['input']>;
  /** A city in the same timezone as you. */
  readonly generalSettingsTimezone?: InputMaybe<Scalars['String']['input']>;
  /** Site title. */
  readonly generalSettingsTitle?: InputMaybe<Scalars['String']['input']>;
  /**
   * Site URL.
   * @deprecated The site URL is read-only and cannot be changed through the API.
   */
  readonly generalSettingsUrl?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the page that should display the latest posts */
  readonly readingSettingsPageForPosts?: InputMaybe<Scalars['Int']['input']>;
  /** The ID of the page that should be displayed on the front page */
  readonly readingSettingsPageOnFront?: InputMaybe<Scalars['Int']['input']>;
  /** Blog pages show at most. */
  readonly readingSettingsPostsPerPage?: InputMaybe<Scalars['Int']['input']>;
  /** What to show on the front page */
  readonly readingSettingsShowOnFront?: InputMaybe<Scalars['String']['input']>;
  /** Default post category. */
  readonly writingSettingsDefaultCategory?: InputMaybe<Scalars['Int']['input']>;
  /** Default post format. */
  readonly writingSettingsDefaultPostFormat?: InputMaybe<Scalars['String']['input']>;
  /** Convert emoticons like :-) and :-P to graphics on display. */
  readonly writingSettingsUseSmilies?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for the updateSiteScope mutation. */
export type UpdateSiteScopeInput = {
  /** The slug that the site_scope will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the site_scope object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the SiteScope object to update */
  readonly id: Scalars['ID']['input'];
  /** The name of the site_scope object to mutate */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTag mutation. */
export type UpdateTagInput = {
  /** The slug that the post_tag will be an alias of */
  readonly aliasOf?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The description of the post_tag object */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the tag object to update */
  readonly id: Scalars['ID']['input'];
  /** The name of the post_tag object to mutate */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** If this argument exists then the slug will be checked to see if it is not an existing valid term. If that check succeeds (it is not a valid term), then it is added and the term id is given. If it fails, then a check is made to whether the taxonomy is hierarchical and the parent argument is not empty. If the second check succeeds, the term will be inserted and the term id will be given. If the slug argument is empty, then it will be calculated from the term name. */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Application mutation. */
export type UpdateTio2ApplicationInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Application object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Application and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2ApplicationSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Document mutation. */
export type UpdateTio2DocumentInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Document object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Document and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2DocumentSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Faq mutation. */
export type UpdateTio2FaqInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Faq object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Faq and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2FaqSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Grade mutation. */
export type UpdateTio2GradeInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Grade object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Grade and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2GradeSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Homepage mutation. */
export type UpdateTio2HomepageInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Homepage object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Homepage and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2HomepageSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateTio2Product mutation. */
export type UpdateTio2ProductInput = {
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** The content of the object */
  readonly content?: InputMaybe<Scalars['String']['input']>;
  /** The date of the object. Preferable to enter as year/month/day (e.g. 01/31/2017) as it will rearrange date as fit if it is not specified. Incomplete dates may have unintended results for example, "2017" as the input will use current date with timestamp 20:17  */
  readonly date?: InputMaybe<Scalars['String']['input']>;
  /** The excerpt of the object */
  readonly excerpt?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the Tio2Product object */
  readonly id: Scalars['ID']['input'];
  /** Override the edit lock when another user is editing the post */
  readonly ignoreEditLock?: InputMaybe<Scalars['Boolean']['input']>;
  /** A field used for ordering posts. This is typically used with nav menu items or for special ordering of hierarchical content types. */
  readonly menuOrder?: InputMaybe<Scalars['Int']['input']>;
  /** The password used to protect the content of the object */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Set connections between the Tio2Product and ProductFamilies */
  readonly productFamilies?: InputMaybe<Tio2ProductProductFamiliesInput>;
  /** Set connections between the Tio2Product and SiteScopes */
  readonly siteScopes?: InputMaybe<Tio2ProductSiteScopesInput>;
  /** The slug of the object */
  readonly slug?: InputMaybe<Scalars['String']['input']>;
  /** The status of the object */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** The title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Input for the updateUser mutation. */
export type UpdateUserInput = {
  /** User's AOL IM account. */
  readonly aim?: InputMaybe<Scalars['String']['input']>;
  /** This is an ID that can be passed to a mutation by the client to track the progress of mutations and catch possible duplicate mutation submissions. */
  readonly clientMutationId?: InputMaybe<Scalars['String']['input']>;
  /** A string containing content about the user. */
  readonly description?: InputMaybe<Scalars['String']['input']>;
  /** A string that will be shown on the site. Defaults to user's username. It is likely that you will want to change this, for both appearance and security through obscurity (that is if you dont use and delete the default admin user). */
  readonly displayName?: InputMaybe<Scalars['String']['input']>;
  /** A string containing the user's email address. */
  readonly email?: InputMaybe<Scalars['String']['input']>;
  /** The user's first name. */
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the user */
  readonly id: Scalars['ID']['input'];
  /** User's Jabber account. */
  readonly jabber?: InputMaybe<Scalars['String']['input']>;
  /** The user's last name. */
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  /** User's locale. */
  readonly locale?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains a URL-friendly name for the user. The default is the user's username. */
  readonly nicename?: InputMaybe<Scalars['String']['input']>;
  /** The user's nickname, defaults to the user's username. */
  readonly nickname?: InputMaybe<Scalars['String']['input']>;
  /** A string that contains the plain text password for the user. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** The date the user registered. Format is Y-m-d H:i:s. */
  readonly registered?: InputMaybe<Scalars['String']['input']>;
  /** A string for whether to enable the rich editor or not. False if not empty. */
  readonly richEditing?: InputMaybe<Scalars['String']['input']>;
  /** An array of roles to be assigned to the user. */
  readonly roles?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** A string containing the user's URL for the user's web site. */
  readonly websiteUrl?: InputMaybe<Scalars['String']['input']>;
  /** User's Yahoo IM account. */
  readonly yim?: InputMaybe<Scalars['String']['input']>;
};

/** Identifier types for retrieving a specific user. Determines whether to look up users by ID, email, username, or other unique properties. */
export type UserNodeIdTypeEnum =
  /** The Database ID for the node */
  | 'DATABASE_ID'
  /** The Email of the User */
  | 'EMAIL'
  /** The hashed Global ID */
  | 'ID'
  /** The slug of the User */
  | 'SLUG'
  /** The URI for the node */
  | 'URI'
  /** The username the User uses to login with */
  | 'USERNAME';

/** Permission levels for user accounts. Defines the standard access levels that control what actions users can perform within the system. */
export type UserRoleEnum =
  /** Full system access with ability to manage all aspects of the site. */
  | 'ADMINISTRATOR'
  /** Can publish and manage their own content. */
  | 'AUTHOR'
  /** Can write and manage their own content but cannot publish. */
  | 'CONTRIBUTOR'
  /** Content management access without administrative capabilities. */
  | 'EDITOR'
  /** User role with specific capabilities */
  | 'SEO_EDITOR'
  /** User role with specific capabilities */
  | 'SEO_MANAGER'
  /** Can only manage their profile and read content. */
  | 'SUBSCRIBER';

/** Arguments for filtering the UserToCommentConnection connection */
export type UserToCommentConnectionWhereArgs = {
  /** Comment author email address. */
  readonly authorEmail?: InputMaybe<Scalars['String']['input']>;
  /** Array of author IDs to include comments for. */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to exclude comments for. */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Comment author URL. */
  readonly authorUrl?: InputMaybe<Scalars['String']['input']>;
  /** Array of comment IDs to include. */
  readonly commentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of IDs of users whose unapproved comments will be returned by the query regardless of status. */
  readonly commentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Include comments of a given type. */
  readonly commentType?: InputMaybe<Scalars['String']['input']>;
  /** Include comments from a given array of comment types. */
  readonly commentTypeIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Exclude comments from a given array of comment types. */
  readonly commentTypeNotIn?: InputMaybe<Scalars['String']['input']>;
  /** Content object author ID to limit results by. */
  readonly contentAuthor?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs to retrieve comments for. */
  readonly contentAuthorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of author IDs *not* to retrieve comments for. */
  readonly contentAuthorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Limit results to those affiliated with a given content object ID. */
  readonly contentId?: InputMaybe<Scalars['ID']['input']>;
  /** Array of content object IDs to include affiliated comments for. */
  readonly contentIdIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of content object IDs to exclude affiliated comments for. */
  readonly contentIdNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Content object name (i.e. slug ) to retrieve affiliated comments for. */
  readonly contentName?: InputMaybe<Scalars['String']['input']>;
  /** Content Object parent ID to retrieve affiliated comments for. */
  readonly contentParent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of content object statuses to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentStatus?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Content object type or array of types to retrieve affiliated comments for. Pass 'any' to match any value. */
  readonly contentType?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Array of IDs or email addresses of users whose unapproved comments will be returned by the query regardless of $status. Default empty */
  readonly includeUnapproved?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Karma score to retrieve matching comments for. */
  readonly karma?: InputMaybe<Scalars['Int']['input']>;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
  /** Field to order the comments by. */
  readonly orderby?: InputMaybe<CommentsConnectionOrderbyEnum>;
  /** Parent ID of comment to retrieve children of. */
  readonly parent?: InputMaybe<Scalars['Int']['input']>;
  /** Array of parent IDs of comments to retrieve children for. */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of parent IDs of comments *not* to retrieve children for. */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Search term(s) to retrieve matching comments for. */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /**
   * Comment status to limit results by.
   * @deprecated Deprecated in favor of statusIn which accepts a list of one or more CommentStatusEnum values instead of a string
   */
  readonly status?: InputMaybe<Scalars['String']['input']>;
  /** One or more Comment Statuses to limit results by */
  readonly statusIn?: InputMaybe<ReadonlyArray<InputMaybe<CommentStatusEnum>>>;
  /** Include comments for a specific user ID. */
  readonly userId?: InputMaybe<Scalars['ID']['input']>;
};

/** Arguments for filtering the UserToEnqueuedScriptConnection connection */
export type UserToEnqueuedScriptConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the UserToEnqueuedStylesheetConnection connection */
export type UserToEnqueuedStylesheetConnectionWhereArgs = {
  /** Limit results to assets whose handle is in the provided list. Handles that do not match an asset are ignored. An empty list matches no assets, while omitting the argument (or passing null) leaves the connection unfiltered. */
  readonly handlesIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
};

/** Arguments for filtering the UserToMediaItemConnection connection */
export type UserToMediaItemConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the UserToPageConnection connection */
export type UserToPageConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the UserToPostConnection connection */
export type UserToPostConnectionWhereArgs = {
  /** The user that's connected as the author of the object. Use the userId for the author object. */
  readonly author?: InputMaybe<Scalars['Int']['input']>;
  /** Find objects connected to author(s) in the array of author's userIds */
  readonly authorIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Find objects connected to the author by the author's nicename */
  readonly authorName?: InputMaybe<Scalars['String']['input']>;
  /** Find objects NOT connected to author(s) in the array of author's userIds */
  readonly authorNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Category ID */
  readonly categoryId?: InputMaybe<Scalars['Int']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Use Category Slug */
  readonly categoryName?: InputMaybe<Scalars['String']['input']>;
  /** Array of category IDs, used to display objects from one category OR another */
  readonly categoryNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Tag Slug */
  readonly tag?: InputMaybe<Scalars['String']['input']>;
  /** Use Tag ID */
  readonly tagId?: InputMaybe<Scalars['String']['input']>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag IDs, used to display objects from one tag OR another */
  readonly tagNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Array of tag slugs, used to display objects from one tag AND another */
  readonly tagSlugAnd?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Array of tag slugs, used to include objects in ANY specified tags */
  readonly tagSlugIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** Arguments for filtering the UserToRevisionsConnection connection */
export type UserToRevisionsConnectionWhereArgs = {
  /** The Types of content to filter */
  readonly contentTypes?: InputMaybe<ReadonlyArray<InputMaybe<ContentTypeEnum>>>;
  /** Filter the connection based on dates */
  readonly dateQuery?: InputMaybe<DateQueryInput>;
  /** True for objects with passwords; False for objects without passwords; null for all objects with or without passwords */
  readonly hasPassword?: InputMaybe<Scalars['Boolean']['input']>;
  /** Specific database ID of the object */
  readonly id?: InputMaybe<Scalars['Int']['input']>;
  /** Array of IDs for the objects to retrieve */
  readonly in?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** True to limit the results to sticky posts; false to exclude sticky posts. Note: this filters the result set, it does not float sticky posts to the top of the results. */
  readonly isSticky?: InputMaybe<Scalars['Boolean']['input']>;
  /** Get objects with a specific mimeType property */
  readonly mimeType?: InputMaybe<MimeTypeEnum>;
  /** Slug / post_name of the object */
  readonly name?: InputMaybe<Scalars['String']['input']>;
  /** Specify objects to retrieve. Use slugs */
  readonly nameIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['String']['input']>>>;
  /** Specify IDs NOT to retrieve. If this is used in the same query as "in", it will be ignored */
  readonly notIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** What parameter to use to order the objects by. */
  readonly orderby?: InputMaybe<ReadonlyArray<InputMaybe<PostObjectsConnectionOrderbyInput>>>;
  /** Use ID to return only children. Use 0 to return only top-level items */
  readonly parent?: InputMaybe<Scalars['ID']['input']>;
  /** Specify objects whose parent is in an array */
  readonly parentIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Specify posts whose parent is not in an array */
  readonly parentNotIn?: InputMaybe<ReadonlyArray<InputMaybe<Scalars['ID']['input']>>>;
  /** Show posts with a specific password. */
  readonly password?: InputMaybe<Scalars['String']['input']>;
  /** Show Posts based on a keyword search */
  readonly search?: InputMaybe<Scalars['String']['input']>;
  /** Retrieve posts where post status is in an array. */
  readonly stati?: InputMaybe<ReadonlyArray<InputMaybe<PostStatusEnum>>>;
  /** Show posts with a specific status. */
  readonly status?: InputMaybe<PostStatusEnum>;
  /** Filter the connection to content assigned a specific template. */
  readonly template?: InputMaybe<ContentTemplateEnum>;
  /** Title of the object */
  readonly title?: InputMaybe<Scalars['String']['input']>;
};

/** User attribute sorting options. Determines which property of user accounts is used for ordering user listings. */
export type UsersConnectionOrderbyEnum =
  /** Order by display name */
  | 'DISPLAY_NAME'
  /** Order by email address */
  | 'EMAIL'
  /** Order by login */
  | 'LOGIN'
  /** Preserve the login order given in the LOGIN_IN array */
  | 'LOGIN_IN'
  /** Order by nice name */
  | 'NICE_NAME'
  /** Preserve the nice name order given in the NICE_NAME_IN array */
  | 'NICE_NAME_IN'
  /** Order by registration date */
  | 'REGISTERED'
  /** Order by URL */
  | 'URL';

/** Options for ordering the connection */
export type UsersConnectionOrderbyInput = {
  /** The field name used to sort the results. */
  readonly field: UsersConnectionOrderbyEnum;
  /** The cardinality of the order of the connection */
  readonly order?: InputMaybe<OrderEnum>;
};

/** User properties that can be targeted in search operations. Defines which user attributes can be searched when looking for specific users. */
export type UsersConnectionSearchColumnEnum =
  /** The user's email address. */
  | 'EMAIL'
  /** The globally unique ID. */
  | 'ID'
  /** The username the User uses to login with. */
  | 'LOGIN'
  /** A URL-friendly name for the user. The default is the user's username. */
  | 'NICENAME'
  /** The URL of the user's website. */
  | 'URL';

export type ApplicationSiteScopeFieldsFragment = { readonly slug: string | null };

export type ApplicationEditorialLinkFieldsFragment = { readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null };

export type SiteApplicationFieldsFragment = { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly siteAApplicationFields: { readonly applicationId: string, readonly applicationLevel: string, readonly family: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly applicationContext: string, readonly buyerProblem: string, readonly selectionFactors: ReadonlyArray<string>, readonly powderDataLimits: string, readonly validationPlan: ReadonlyArray<string>, readonly customerInputs: ReadonlyArray<string>, readonly technicalDisclaimer: string, readonly parentApplication: { readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null } | null, readonly bodySections: ReadonlyArray<{ readonly id: string, readonly heading: string, readonly html: string }>, readonly startingProducts: ReadonlyArray<{ readonly productId: string, readonly role: string, readonly label: string, readonly summaryHtml: string }>, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answerHtml: string }>, readonly childApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedProducts: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly ctas: ReadonlyArray<{ readonly kind: string, readonly label: string, readonly href: string }> } | null };

export type GetSiteApplicationQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetSiteApplicationQuery = { readonly tio2Application: { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly siteAApplicationFields: { readonly applicationId: string, readonly applicationLevel: string, readonly family: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly applicationContext: string, readonly buyerProblem: string, readonly selectionFactors: ReadonlyArray<string>, readonly powderDataLimits: string, readonly validationPlan: ReadonlyArray<string>, readonly customerInputs: ReadonlyArray<string>, readonly technicalDisclaimer: string, readonly parentApplication: { readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null } | null, readonly bodySections: ReadonlyArray<{ readonly id: string, readonly heading: string, readonly html: string }>, readonly startingProducts: ReadonlyArray<{ readonly productId: string, readonly role: string, readonly label: string, readonly summaryHtml: string }>, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answerHtml: string }>, readonly childApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedProducts: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly ctas: ReadonlyArray<{ readonly kind: string, readonly label: string, readonly href: string }> } | null } | null };

export type HomepageMediaItemFieldsFragment = { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null };

export type HomepageFieldsFragment = { readonly id: string, readonly databaseId: number, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroPrimaryLabel: string | null, readonly heroSecondaryLabel: string | null, readonly heroSecondaryPath: string | null, readonly heroImageAlt: string | null, readonly productsHeading: string | null, readonly productsIntro: string | null, readonly applicationsHeading: string | null, readonly applicationsIntro: string | null, readonly inquiryHeading: string | null, readonly trustHeading: string | null, readonly trustIntro: string | null, readonly rfqHeading: string | null, readonly rfqIntro: ReadonlyArray<string | null> | null, readonly rfqSubmitLabel: string | null, readonly rfqPrivacyText: ReadonlyArray<string | null> | null, readonly rfqSuccessHeading: ReadonlyArray<string | null> | null, readonly rfqSuccessMessage: ReadonlyArray<string | null> | null, readonly faqHeading: string | null, readonly closingHeading: string | null, readonly closingBody: string | null, readonly closingLabel: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly metrics: ReadonlyArray<{ readonly metricValue: string | null, readonly metricUnit: string | null, readonly metricLabel: string | null, readonly metricContext: string | null, readonly metricClaimBasis: ReadonlyArray<string | null> | null, readonly metricEvidenceUrl: string | null } | null> | null, readonly productRoutes: ReadonlyArray<{ readonly productTitle: string | null, readonly productSummary: string | null, readonly productPath: string | null, readonly productImageAlt: string | null, readonly productImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null } | null> | null, readonly applications: ReadonlyArray<{ readonly applicationName: string | null, readonly applicationSummary: string | null, readonly applicationPath: string | null, readonly applicationImageAlt: string | null, readonly applicationImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null } | null> | null, readonly inquirySteps: ReadonlyArray<{ readonly inquiryStepTitle: string | null, readonly inquiryStepDescription: string | null } | null> | null, readonly trustReasons: ReadonlyArray<{ readonly trustReasonTitle: string | null, readonly trustReasonDescription: string | null, readonly trustReasonClaimBasis: ReadonlyArray<string | null> | null, readonly trustReasonEvidenceUrl: string | null } | null> | null, readonly rfqLabels: { readonly rfqLabelName: string | null, readonly rfqLabelCompany: string | null, readonly rfqLabelCountryRegion: string | null, readonly rfqLabelWorkEmail: string | null, readonly rfqLabelBuyerType: string | null, readonly rfqLabelInterest: string | null, readonly rfqLabelExpectedQuantity: string | null, readonly rfqLabelDestination: string | null, readonly rfqLabelMessage: string | null, readonly rfqLabelPrivacy: string | null, readonly rfqBuyerIndustrialLabel: string | null, readonly rfqBuyerDistributorLabel: string | null, readonly rfqBuyerOtherLabel: string | null } | null, readonly faqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null, readonly faqRelatedLabel: string | null, readonly faqRelatedPath: string | null } | null> | null, readonly ogImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null };

export type GetHomepageQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetHomepageQuery = { readonly tio2Homepage: { readonly id: string, readonly databaseId: number, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroPrimaryLabel: string | null, readonly heroSecondaryLabel: string | null, readonly heroSecondaryPath: string | null, readonly heroImageAlt: string | null, readonly productsHeading: string | null, readonly productsIntro: string | null, readonly applicationsHeading: string | null, readonly applicationsIntro: string | null, readonly inquiryHeading: string | null, readonly trustHeading: string | null, readonly trustIntro: string | null, readonly rfqHeading: string | null, readonly rfqIntro: ReadonlyArray<string | null> | null, readonly rfqSubmitLabel: string | null, readonly rfqPrivacyText: ReadonlyArray<string | null> | null, readonly rfqSuccessHeading: ReadonlyArray<string | null> | null, readonly rfqSuccessMessage: ReadonlyArray<string | null> | null, readonly faqHeading: string | null, readonly closingHeading: string | null, readonly closingBody: string | null, readonly closingLabel: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly metrics: ReadonlyArray<{ readonly metricValue: string | null, readonly metricUnit: string | null, readonly metricLabel: string | null, readonly metricContext: string | null, readonly metricClaimBasis: ReadonlyArray<string | null> | null, readonly metricEvidenceUrl: string | null } | null> | null, readonly productRoutes: ReadonlyArray<{ readonly productTitle: string | null, readonly productSummary: string | null, readonly productPath: string | null, readonly productImageAlt: string | null, readonly productImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null } | null> | null, readonly applications: ReadonlyArray<{ readonly applicationName: string | null, readonly applicationSummary: string | null, readonly applicationPath: string | null, readonly applicationImageAlt: string | null, readonly applicationImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null } | null> | null, readonly inquirySteps: ReadonlyArray<{ readonly inquiryStepTitle: string | null, readonly inquiryStepDescription: string | null } | null> | null, readonly trustReasons: ReadonlyArray<{ readonly trustReasonTitle: string | null, readonly trustReasonDescription: string | null, readonly trustReasonClaimBasis: ReadonlyArray<string | null> | null, readonly trustReasonEvidenceUrl: string | null } | null> | null, readonly rfqLabels: { readonly rfqLabelName: string | null, readonly rfqLabelCompany: string | null, readonly rfqLabelCountryRegion: string | null, readonly rfqLabelWorkEmail: string | null, readonly rfqLabelBuyerType: string | null, readonly rfqLabelInterest: string | null, readonly rfqLabelExpectedQuantity: string | null, readonly rfqLabelDestination: string | null, readonly rfqLabelMessage: string | null, readonly rfqLabelPrivacy: string | null, readonly rfqBuyerIndustrialLabel: string | null, readonly rfqBuyerDistributorLabel: string | null, readonly rfqBuyerOtherLabel: string | null } | null, readonly faqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null, readonly faqRelatedLabel: string | null, readonly faqRelatedPath: string | null } | null> | null, readonly ogImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null } | null };

export type SiteAEditorialHomepageFieldsFragment = { readonly id: string, readonly databaseId: number, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroImageAlt: string | null, readonly closingHeading: string | null, readonly closingBody: string | null, readonly closingLabel: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly ogImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null, readonly editorialGeoFields: { readonly headerRfqLabel: string | null, readonly directAnswerQuestion: string | null, readonly directAnswerLead: string | null, readonly directAnswerBody: string | null, readonly editorialReviewedAt: string | null, readonly editorialReviewedBy: string | null, readonly editorialReviewScope: string | null, readonly decisionQuestions: ReadonlyArray<{ readonly decisionNumber: string | null, readonly decisionQuestion: string | null, readonly decisionAnswer: string | null } | null> | null, readonly applicationBriefs: ReadonlyArray<{ readonly applicationName: string | null, readonly applicationSummary: string | null, readonly applicationConsiderations: string | null } | null> | null, readonly supplyRoutes: ReadonlyArray<{ readonly routeName: string | null, readonly routeMeaning: string | null, readonly buyerVerification: string | null, readonly documentationContext: string | null, readonly claimBasis: ReadonlyArray<string | null> | null, readonly evidenceUrl: string | null } | null> | null, readonly evidenceItems: ReadonlyArray<{ readonly documentType: string | null, readonly documentTitle: string | null, readonly documentSummary: string | null, readonly applicability: string | null, readonly revisionLabel: string | null, readonly evidenceUrl: string | null, readonly verificationStatus: ReadonlyArray<string | null> | null } | null> | null, readonly evaluationSteps: ReadonlyArray<{ readonly methodNumber: string | null, readonly methodTitle: string | null, readonly methodDescription: string | null } | null> | null, readonly geoFaqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null } | null> | null, readonly glossaryItems: ReadonlyArray<{ readonly term: string | null, readonly definition: string | null } | null> | null } | null };

export type GetSiteAEditorialHomepageQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetSiteAEditorialHomepageQuery = { readonly tio2Homepage: { readonly id: string, readonly databaseId: number, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroImageAlt: string | null, readonly closingHeading: string | null, readonly closingBody: string | null, readonly closingLabel: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly ogImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null, readonly editorialGeoFields: { readonly headerRfqLabel: string | null, readonly directAnswerQuestion: string | null, readonly directAnswerLead: string | null, readonly directAnswerBody: string | null, readonly editorialReviewedAt: string | null, readonly editorialReviewedBy: string | null, readonly editorialReviewScope: string | null, readonly decisionQuestions: ReadonlyArray<{ readonly decisionNumber: string | null, readonly decisionQuestion: string | null, readonly decisionAnswer: string | null } | null> | null, readonly applicationBriefs: ReadonlyArray<{ readonly applicationName: string | null, readonly applicationSummary: string | null, readonly applicationConsiderations: string | null } | null> | null, readonly supplyRoutes: ReadonlyArray<{ readonly routeName: string | null, readonly routeMeaning: string | null, readonly buyerVerification: string | null, readonly documentationContext: string | null, readonly claimBasis: ReadonlyArray<string | null> | null, readonly evidenceUrl: string | null } | null> | null, readonly evidenceItems: ReadonlyArray<{ readonly documentType: string | null, readonly documentTitle: string | null, readonly documentSummary: string | null, readonly applicability: string | null, readonly revisionLabel: string | null, readonly evidenceUrl: string | null, readonly verificationStatus: ReadonlyArray<string | null> | null } | null> | null, readonly evaluationSteps: ReadonlyArray<{ readonly methodNumber: string | null, readonly methodTitle: string | null, readonly methodDescription: string | null } | null> | null, readonly geoFaqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null } | null> | null, readonly glossaryItems: ReadonlyArray<{ readonly term: string | null, readonly definition: string | null } | null> | null } | null } | null };

export type SiteABrandHomepageFieldsFragment = { readonly id: string, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroImageAlt: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null, readonly brandHomepageFields: { readonly heroPrimaryLabel: string | null, readonly heroSecondaryLabel: string | null, readonly aboutEyebrow: string | null, readonly aboutHeading: string | null, readonly whoTitle: string | null, readonly whoBody: string | null, readonly whatTitle: string | null, readonly whatBody: string | null, readonly routesEyebrow: string | null, readonly routesHeading: string | null, readonly applicationsEyebrow: string | null, readonly applicationsHeading: string | null, readonly applicationsIntro: string | null, readonly familiesEyebrow: string | null, readonly familiesHeading: string | null, readonly familiesIntro: string | null, readonly selectionEyebrow: string | null, readonly selectionHeading: string | null, readonly selectionIntro: string | null, readonly resourcesEyebrow: string | null, readonly resourcesHeading: string | null, readonly processEyebrow: string | null, readonly processHeading: string | null, readonly documentsEyebrow: string | null, readonly documentsHeading: string | null, readonly documentsIntro: string | null, readonly inquiryEyebrow: string | null, readonly inquiryHeading: string | null, readonly inquiryIntro: string | null, readonly inquiryMessageLabel: string | null, readonly inquirySubmitLabel: string | null, readonly inquiryHelperText: string | null, readonly inquirySuccessHeading: string | null, readonly inquirySuccessMessage: string | null, readonly faqEyebrow: string | null, readonly faqHeading: string | null, readonly footerDescription: string | null, readonly capabilities: ReadonlyArray<{ readonly capability: string | null } | null> | null, readonly brandMetrics: ReadonlyArray<{ readonly metricValue: string | null, readonly metricLabel: string | null } | null> | null, readonly buyerRoutes: ReadonlyArray<{ readonly routeTitle: string | null, readonly routeDescription: string | null, readonly routeCtaLabel: string | null } | null> | null, readonly brandApplications: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly productFamilies: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly selectionFactors: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly technicalResources: ReadonlyArray<{ readonly resourceTag: string | null, readonly resourceTitle: string | null, readonly resourceDescription: string | null } | null> | null, readonly evaluationSteps: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly controlledDocuments: ReadonlyArray<{ readonly documentTitle: string | null, readonly documentContext: string | null, readonly documentAccess: ReadonlyArray<string | null> | null } | null> | null, readonly inquiryFields: ReadonlyArray<{ readonly fieldLabel: string | null } | null> | null, readonly brandFaqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null } | null> | null } | null };

export type GetSiteABrandHomepageQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetSiteABrandHomepageQuery = { readonly tio2Homepage: { readonly id: string, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly heroEyebrow: string | null, readonly heroHeading: string | null, readonly heroSummary: string | null, readonly heroImageAlt: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null, readonly primaryTopic: string | null, readonly homepageSchemaVersion: string | null, readonly heroImage: { readonly node: { readonly mediaItemUrl: string | null, readonly altText: string | null, readonly mimeType: string | null, readonly mediaDetails: { readonly width: number | null, readonly height: number | null } | null } } | null, readonly secondaryTopics: ReadonlyArray<{ readonly secondaryTopic: string | null } | null> | null } | null, readonly brandHomepageFields: { readonly heroPrimaryLabel: string | null, readonly heroSecondaryLabel: string | null, readonly aboutEyebrow: string | null, readonly aboutHeading: string | null, readonly whoTitle: string | null, readonly whoBody: string | null, readonly whatTitle: string | null, readonly whatBody: string | null, readonly routesEyebrow: string | null, readonly routesHeading: string | null, readonly applicationsEyebrow: string | null, readonly applicationsHeading: string | null, readonly applicationsIntro: string | null, readonly familiesEyebrow: string | null, readonly familiesHeading: string | null, readonly familiesIntro: string | null, readonly selectionEyebrow: string | null, readonly selectionHeading: string | null, readonly selectionIntro: string | null, readonly resourcesEyebrow: string | null, readonly resourcesHeading: string | null, readonly processEyebrow: string | null, readonly processHeading: string | null, readonly documentsEyebrow: string | null, readonly documentsHeading: string | null, readonly documentsIntro: string | null, readonly inquiryEyebrow: string | null, readonly inquiryHeading: string | null, readonly inquiryIntro: string | null, readonly inquiryMessageLabel: string | null, readonly inquirySubmitLabel: string | null, readonly inquiryHelperText: string | null, readonly inquirySuccessHeading: string | null, readonly inquirySuccessMessage: string | null, readonly faqEyebrow: string | null, readonly faqHeading: string | null, readonly footerDescription: string | null, readonly capabilities: ReadonlyArray<{ readonly capability: string | null } | null> | null, readonly brandMetrics: ReadonlyArray<{ readonly metricValue: string | null, readonly metricLabel: string | null } | null> | null, readonly buyerRoutes: ReadonlyArray<{ readonly routeTitle: string | null, readonly routeDescription: string | null, readonly routeCtaLabel: string | null } | null> | null, readonly brandApplications: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly productFamilies: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly selectionFactors: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly technicalResources: ReadonlyArray<{ readonly resourceTag: string | null, readonly resourceTitle: string | null, readonly resourceDescription: string | null } | null> | null, readonly evaluationSteps: ReadonlyArray<{ readonly itemTitle: string | null, readonly itemDescription: string | null } | null> | null, readonly controlledDocuments: ReadonlyArray<{ readonly documentTitle: string | null, readonly documentContext: string | null, readonly documentAccess: ReadonlyArray<string | null> | null } | null> | null, readonly inquiryFields: ReadonlyArray<{ readonly fieldLabel: string | null } | null> | null, readonly brandFaqs: ReadonlyArray<{ readonly faqQuestion: string | null, readonly faqAnswer: string | null } | null> | null } | null } | null };

export type MalaysiaHomepageFieldsFragment = { readonly id: string, readonly modifiedGmt: string | null, readonly status: string | null, readonly malaysiaHomepageContractJson: string, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly homepageSchemaVersion: string | null } | null };

export type GetMalaysiaHomepageQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetMalaysiaHomepageQuery = { readonly tio2Homepage: { readonly id: string, readonly modifiedGmt: string | null, readonly status: string | null, readonly malaysiaHomepageContractJson: string, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly homepageFields: { readonly homepageSchemaVersion: string | null } | null } | null };

export type GetMalaysiaMarketHubQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMalaysiaMarketHubQuery = { readonly malaysiaMarketHubRecordJson: string };

export type GetMalaysiaProductDetailQueryVariables = Exact<{
  slug: string;
}>;


export type GetMalaysiaProductDetailQuery = { readonly malaysiaProductDetailRecordJson: string };

export type GetMalaysiaProductHubQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMalaysiaProductHubQuery = { readonly malaysiaProductHubRecordJson: string };

export type ProductPageCollectionLinkFieldsFragment = { readonly databaseId: number, readonly title: string, readonly path: string };

export type ProductPageCollectionFaqFieldsFragment = { readonly question: string, readonly answer: string };

export type ProductPageFamilySummaryFieldsFragment = { readonly slug: string, readonly name: string, readonly path: string, readonly headline: string, readonly directAnswer: string, readonly heroImageId: number, readonly productCount: number };

export type ProductPageCollectionCardFieldsFragment = { readonly databaseId: number, readonly productId: string, readonly slug: string, readonly title: string, readonly path: string, readonly displayOrder: number, readonly familyCardSummary: string, readonly applicationFocus: string, readonly performanceFocus: string, readonly surfaceTreatmentPositioning: string, readonly filterTags: ReadonlyArray<string> };

export type ProductPageSiteScopeFieldsFragment = { readonly slug: string | null };

export type ProductPageApplicationLinkFieldsFragment = { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type ProductPageResourceLinkFieldsFragment = { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type ProductPageProductLinkFieldsFragment = { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type ProductPageDetailFieldsFragment = { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly productFields: { readonly productId: string | null, readonly metaTitle: string | null, readonly metaDescription: string | null, readonly eyebrow: string | null, readonly customerProblemHeadline: string | null, readonly quickAnswer: string | null, readonly productType: string | null, readonly process: string | null, readonly primaryApplication: string | null, readonly positioning: string | null, readonly surfaceTreatment: string | null, readonly evidenceStatement: string | null, readonly packaging: string | null, readonly tdsAccess: string | null, readonly family: { readonly nodes: ReadonlyArray<
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
      > } | null, readonly fitWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly discussFirstWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly performancePriorities: ReadonlyArray<{ readonly title: string | null, readonly explanation: string | null } | null> | null, readonly recommendedApplications: { readonly nodes: ReadonlyArray<
        | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
        | Record<PropertyKey, never>
      > } | null, readonly typicalProperties: ReadonlyArray<{ readonly property: string | null, readonly value: string | null, readonly unit: string | null, readonly method: string | null, readonly note: string | null, readonly displayOrder: number | null } | null> | null, readonly validationChecklist: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly faqItems: ReadonlyArray<{ readonly question: string | null, readonly answer: string | null } | null> | null, readonly relatedLinks: { readonly applications: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly resources: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly products: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null } | null } | null };

export type GetSiteProductsHubQueryVariables = Exact<{
  siteId: string;
}>;


export type GetSiteProductsHubQuery = { readonly tio2ProductsHub: { readonly siteId: string, readonly level: string, readonly path: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly heroImageId: number, readonly decisionRail: ReadonlyArray<string>, readonly familyCount: number, readonly productCount: number, readonly knownGradeHeading: string, readonly knownGradeHelp: string, readonly decisionPath: string, readonly applicationBoundary: string, readonly enquiry: string, readonly technicalDisclaimer: string, readonly families: ReadonlyArray<{ readonly slug: string, readonly name: string, readonly path: string, readonly headline: string, readonly directAnswer: string, readonly heroImageId: number, readonly productCount: number }>, readonly resources: ReadonlyArray<{ readonly databaseId: number, readonly title: string, readonly path: string }>, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answer: string }> } | null };

export type GetSiteProductFamilyQueryVariables = Exact<{
  siteId: string;
  slug: string;
}>;


export type GetSiteProductFamilyQuery = { readonly tio2ProductFamily: { readonly siteId: string, readonly level: string, readonly path: string, readonly slug: string, readonly name: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly heroImageId: number, readonly decisionRail: ReadonlyArray<string>, readonly comparisonIntroduction: string, readonly comparisonCaption: string, readonly selectionMethod: string, readonly validationSteps: ReadonlyArray<string>, readonly enquiry: string, readonly technicalDisclaimer: string, readonly filters: ReadonlyArray<{ readonly slug: string, readonly label: string }>, readonly products: ReadonlyArray<{ readonly databaseId: number, readonly productId: string, readonly slug: string, readonly title: string, readonly path: string, readonly displayOrder: number, readonly familyCardSummary: string, readonly applicationFocus: string, readonly performanceFocus: string, readonly surfaceTreatmentPositioning: string, readonly filterTags: ReadonlyArray<string> }>, readonly applications: ReadonlyArray<{ readonly databaseId: number, readonly title: string, readonly path: string }>, readonly resources: ReadonlyArray<{ readonly databaseId: number, readonly title: string, readonly path: string }>, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answer: string }> } | null };

export type GetSiteProductDetailPageQueryVariables = Exact<{
  slug: string | number;
  siteId: string;
}>;


export type GetSiteProductDetailPageQuery = { readonly tio2Product: { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly productFields: { readonly productId: string | null, readonly metaTitle: string | null, readonly metaDescription: string | null, readonly eyebrow: string | null, readonly customerProblemHeadline: string | null, readonly quickAnswer: string | null, readonly productType: string | null, readonly process: string | null, readonly primaryApplication: string | null, readonly positioning: string | null, readonly surfaceTreatment: string | null, readonly evidenceStatement: string | null, readonly packaging: string | null, readonly tdsAccess: string | null, readonly family: { readonly nodes: ReadonlyArray<
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
        > } | null, readonly fitWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly discussFirstWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly performancePriorities: ReadonlyArray<{ readonly title: string | null, readonly explanation: string | null } | null> | null, readonly recommendedApplications: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly typicalProperties: ReadonlyArray<{ readonly property: string | null, readonly value: string | null, readonly unit: string | null, readonly method: string | null, readonly note: string | null, readonly displayOrder: number | null } | null> | null, readonly validationChecklist: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly faqItems: ReadonlyArray<{ readonly question: string | null, readonly answer: string | null } | null> | null, readonly relatedLinks: { readonly applications: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null, readonly resources: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null, readonly products: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null } | null } | null } | null, readonly tio2ProductSettings: { readonly technicalDisclaimer: string, readonly inquiryFields: ReadonlyArray<{ readonly key: string, readonly label: string, readonly guidance: string }>, readonly requestTdsCta: { readonly label: string, readonly description: string }, readonly discussApplicationCta: { readonly label: string, readonly description: string } } | null };

export type ProductSiteScopeFieldsFragment = { readonly slug: string | null };

export type ProductApplicationLinkFieldsFragment = { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type ProductDocumentLinkFieldsFragment = { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type ProductLinkFieldsFragment = { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null };

export type SiteProductFieldsFragment = { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly productFields: { readonly productId: string | null, readonly metaTitle: string | null, readonly metaDescription: string | null, readonly eyebrow: string | null, readonly customerProblemHeadline: string | null, readonly quickAnswer: string | null, readonly productType: string | null, readonly process: string | null, readonly primaryApplication: string | null, readonly positioning: string | null, readonly surfaceTreatment: string | null, readonly evidenceStatement: string | null, readonly packaging: string | null, readonly tdsAccess: string | null, readonly family: { readonly nodes: ReadonlyArray<
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
        | { readonly name: string | null }
      > } | null, readonly fitWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly discussFirstWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly performancePriorities: ReadonlyArray<{ readonly title: string | null, readonly explanation: string | null } | null> | null, readonly recommendedApplications: { readonly nodes: ReadonlyArray<
        | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
        | Record<PropertyKey, never>
      > } | null, readonly typicalProperties: ReadonlyArray<{ readonly property: string | null, readonly value: string | null, readonly unit: string | null, readonly method: string | null, readonly note: string | null, readonly displayOrder: number | null } | null> | null, readonly validationChecklist: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly faqItems: ReadonlyArray<{ readonly question: string | null, readonly answer: string | null } | null> | null, readonly relatedLinks: { readonly applications: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly resources: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly products: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null } | null } | null };

export type GetSiteProductQueryVariables = Exact<{
  slug: string | number;
  siteId: string;
}>;


export type GetSiteProductQuery = { readonly tio2Product: { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly productFields: { readonly productId: string | null, readonly metaTitle: string | null, readonly metaDescription: string | null, readonly eyebrow: string | null, readonly customerProblemHeadline: string | null, readonly quickAnswer: string | null, readonly productType: string | null, readonly process: string | null, readonly primaryApplication: string | null, readonly positioning: string | null, readonly surfaceTreatment: string | null, readonly evidenceStatement: string | null, readonly packaging: string | null, readonly tdsAccess: string | null, readonly family: { readonly nodes: ReadonlyArray<
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
          | { readonly name: string | null }
        > } | null, readonly fitWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly discussFirstWhen: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly performancePriorities: ReadonlyArray<{ readonly title: string | null, readonly explanation: string | null } | null> | null, readonly recommendedApplications: { readonly nodes: ReadonlyArray<
          | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
          | Record<PropertyKey, never>
        > } | null, readonly typicalProperties: ReadonlyArray<{ readonly property: string | null, readonly value: string | null, readonly unit: string | null, readonly method: string | null, readonly note: string | null, readonly displayOrder: number | null } | null> | null, readonly validationChecklist: ReadonlyArray<{ readonly item: string | null } | null> | null, readonly faqItems: ReadonlyArray<{ readonly question: string | null, readonly answer: string | null } | null> | null, readonly relatedLinks: { readonly applications: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly excerpt: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null, readonly resources: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null, readonly products: { readonly nodes: ReadonlyArray<
            | { readonly title: string | null, readonly uri: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null }
            | Record<PropertyKey, never>
          > } | null } | null } | null } | null, readonly tio2ProductSettings: { readonly technicalDisclaimer: string, readonly inquiryFields: ReadonlyArray<{ readonly key: string, readonly label: string, readonly guidance: string }>, readonly requestTdsCta: { readonly label: string, readonly description: string }, readonly discussApplicationCta: { readonly label: string, readonly description: string } } | null };

export type ContentPageFieldsFragment = { readonly __typename: 'Page', readonly id: string, readonly title: string | null, readonly content: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly publishingFields: { readonly __typename: 'PublishingFields', readonly publicPath: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null } | null, readonly siteScopes: { readonly __typename: 'PageToSiteScopeConnection', readonly nodes: ReadonlyArray<{ readonly __typename: 'SiteScope', readonly id: string, readonly slug: string | null }> } | null };

export type GetContentByPathQueryVariables = Exact<{
  uri: string | number;
}>;


export type GetContentByPathQuery = { readonly page: { readonly __typename: 'Page', readonly id: string, readonly title: string | null, readonly content: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly publishingFields: { readonly __typename: 'PublishingFields', readonly publicPath: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null } | null, readonly siteScopes: { readonly __typename: 'PageToSiteScopeConnection', readonly nodes: ReadonlyArray<{ readonly __typename: 'SiteScope', readonly id: string, readonly slug: string | null }> } | null } | null };

export type GetContentPageQueryVariables = Exact<{
  siteId: string | number;
  after?: string | null | undefined;
}>;


export type GetContentPageQuery = { readonly siteScope: { readonly pages: { readonly nodes: ReadonlyArray<{ readonly __typename: 'Page', readonly id: string, readonly title: string | null, readonly content: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly publishingFields: { readonly __typename: 'PublishingFields', readonly publicPath: string | null, readonly seoTitle: string | null, readonly seoDescription: string | null } | null, readonly siteScopes: { readonly __typename: 'PageToSiteScopeConnection', readonly nodes: ReadonlyArray<{ readonly __typename: 'SiteScope', readonly id: string, readonly slug: string | null }> } | null }>, readonly pageInfo: { readonly endCursor: string | null, readonly hasNextPage: boolean } } | null } | null };

export type ResourceSiteScopeFieldsFragment = { readonly slug: string | null };

export type ResourceEditorialLinkFieldsFragment = { readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null };

export type SiteTechnicalResourceFieldsFragment = { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly siteATechnicalResourceFields: { readonly resourceId: string, readonly resourceKind: string, readonly cluster: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly keyTakeaways: ReadonlyArray<string>, readonly practicalImplications: ReadonlyArray<string>, readonly commonMistakes: ReadonlyArray<string>, readonly evaluationMethod: ReadonlyArray<string>, readonly technicalDisclaimer: string, readonly sections: ReadonlyArray<{ readonly id: string, readonly heading: string, readonly html: string }>, readonly comparisonTable: { readonly columns: ReadonlyArray<string>, readonly rows: ReadonlyArray<{ readonly cells: ReadonlyArray<string> }> } | null, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answerHtml: string }>, readonly childResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedProducts: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly ctas: ReadonlyArray<{ readonly kind: string, readonly label: string, readonly href: string }> } | null };

export type GetSiteTechnicalResourceQueryVariables = Exact<{
  slug: string | number;
}>;


export type GetSiteTechnicalResourceQuery = { readonly tio2Document: { readonly id: string, readonly databaseId: number, readonly slug: string | null, readonly title: string | null, readonly modifiedGmt: string | null, readonly status: string | null, readonly siteScopes: { readonly nodes: ReadonlyArray<{ readonly slug: string | null }> } | null, readonly siteATechnicalResourceFields: { readonly resourceId: string, readonly resourceKind: string, readonly cluster: string, readonly metaTitle: string, readonly metaDescription: string, readonly eyebrow: string, readonly headline: string, readonly directAnswer: string, readonly keyTakeaways: ReadonlyArray<string>, readonly practicalImplications: ReadonlyArray<string>, readonly commonMistakes: ReadonlyArray<string>, readonly evaluationMethod: ReadonlyArray<string>, readonly technicalDisclaimer: string, readonly sections: ReadonlyArray<{ readonly id: string, readonly heading: string, readonly html: string }>, readonly comparisonTable: { readonly columns: ReadonlyArray<string>, readonly rows: ReadonlyArray<{ readonly cells: ReadonlyArray<string> }> } | null, readonly faqItems: ReadonlyArray<{ readonly question: string, readonly answerHtml: string }>, readonly childResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedApplications: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedResources: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly relatedProducts: ReadonlyArray<{ readonly targetType: string, readonly targetKey: string, readonly title: string, readonly path: string, readonly href: string | null }>, readonly ctas: ReadonlyArray<{ readonly kind: string, readonly label: string, readonly href: string }> } | null } | null };

export const ApplicationSiteScopeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ApplicationSiteScopeFieldsFragment, unknown>;
export const ApplicationEditorialLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}}]} as unknown as DocumentNode<ApplicationEditorialLinkFieldsFragment, unknown>;
export const SiteApplicationFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteApplicationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteAApplicationFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationId"}},{"kind":"Field","name":{"kind":"Name","value":"applicationLevel"}},{"kind":"Field","name":{"kind":"Name","value":"family"}},{"kind":"Field","name":{"kind":"Name","value":"parentApplication"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"applicationContext"}},{"kind":"Field","name":{"kind":"Name","value":"buyerProblem"}},{"kind":"Field","name":{"kind":"Name","value":"selectionFactors"}},{"kind":"Field","name":{"kind":"Name","value":"powderDataLimits"}},{"kind":"Field","name":{"kind":"Name","value":"validationPlan"}},{"kind":"Field","name":{"kind":"Name","value":"customerInputs"}},{"kind":"Field","name":{"kind":"Name","value":"bodySections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"heading"}},{"kind":"Field","name":{"kind":"Name","value":"html"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startingProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"summaryHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answerHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}}]} as unknown as DocumentNode<SiteApplicationFieldsFragment, unknown>;
export const HomepageMediaItemFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}}]} as unknown as DocumentNode<HomepageMediaItemFieldsFragment, unknown>;
export const HomepageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroPrimaryLabel"}},{"kind":"Field","name":{"kind":"Name","value":"heroSecondaryLabel"}},{"kind":"Field","name":{"kind":"Name","value":"heroSecondaryPath"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"metrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metricValue"}},{"kind":"Field","name":{"kind":"Name","value":"metricUnit"}},{"kind":"Field","name":{"kind":"Name","value":"metricLabel"}},{"kind":"Field","name":{"kind":"Name","value":"metricContext"}},{"kind":"Field","name":{"kind":"Name","value":"metricClaimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"metricEvidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productsHeading"}},{"kind":"Field","name":{"kind":"Name","value":"productsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"productRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productTitle"}},{"kind":"Field","name":{"kind":"Name","value":"productSummary"}},{"kind":"Field","name":{"kind":"Name","value":"productPath"}},{"kind":"Field","name":{"kind":"Name","value":"productImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productImageAlt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationsHeading"}},{"kind":"Field","name":{"kind":"Name","value":"applicationsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"applications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationName"}},{"kind":"Field","name":{"kind":"Name","value":"applicationSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationPath"}},{"kind":"Field","name":{"kind":"Name","value":"applicationImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationImageAlt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"inquiryHeading"}},{"kind":"Field","name":{"kind":"Name","value":"inquirySteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inquiryStepTitle"}},{"kind":"Field","name":{"kind":"Name","value":"inquiryStepDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trustHeading"}},{"kind":"Field","name":{"kind":"Name","value":"trustIntro"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trustReasonTitle"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonDescription"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonClaimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonEvidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rfqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"rfqIntro"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rfqLabelName"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelCompany"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelCountryRegion"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelWorkEmail"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelBuyerType"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelInterest"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelExpectedQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelDestination"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelMessage"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelPrivacy"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerIndustrialLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerDistributorLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerOtherLabel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rfqSubmitLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqPrivacyText"}},{"kind":"Field","name":{"kind":"Name","value":"rfqSuccessHeading"}},{"kind":"Field","name":{"kind":"Name","value":"rfqSuccessMessage"}},{"kind":"Field","name":{"kind":"Name","value":"faqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"faqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"faqRelatedLabel"}},{"kind":"Field","name":{"kind":"Name","value":"faqRelatedPath"}}]}},{"kind":"Field","name":{"kind":"Name","value":"closingHeading"}},{"kind":"Field","name":{"kind":"Name","value":"closingBody"}},{"kind":"Field","name":{"kind":"Name","value":"closingLabel"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ogImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}}]} as unknown as DocumentNode<HomepageFieldsFragment, unknown>;
export const SiteAEditorialHomepageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteAEditorialHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"closingHeading"}},{"kind":"Field","name":{"kind":"Name","value":"closingBody"}},{"kind":"Field","name":{"kind":"Name","value":"closingLabel"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ogImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"editorialGeoFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"headerRfqLabel"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerLead"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerBody"}},{"kind":"Field","name":{"kind":"Name","value":"decisionQuestions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"decisionNumber"}},{"kind":"Field","name":{"kind":"Name","value":"decisionQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"decisionAnswer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationBriefs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationName"}},{"kind":"Field","name":{"kind":"Name","value":"applicationSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationConsiderations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"supplyRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routeName"}},{"kind":"Field","name":{"kind":"Name","value":"routeMeaning"}},{"kind":"Field","name":{"kind":"Name","value":"buyerVerification"}},{"kind":"Field","name":{"kind":"Name","value":"documentationContext"}},{"kind":"Field","name":{"kind":"Name","value":"claimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"documentType"}},{"kind":"Field","name":{"kind":"Name","value":"documentTitle"}},{"kind":"Field","name":{"kind":"Name","value":"documentSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicability"}},{"kind":"Field","name":{"kind":"Name","value":"revisionLabel"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceUrl"}},{"kind":"Field","name":{"kind":"Name","value":"verificationStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evaluationSteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"methodNumber"}},{"kind":"Field","name":{"kind":"Name","value":"methodTitle"}},{"kind":"Field","name":{"kind":"Name","value":"methodDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geoFaqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"glossaryItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"term"}},{"kind":"Field","name":{"kind":"Name","value":"definition"}}]}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewedBy"}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewScope"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}}]} as unknown as DocumentNode<SiteAEditorialHomepageFieldsFragment, unknown>;
export const SiteABrandHomepageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteABrandHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"brandHomepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"heroPrimaryLabel"},"name":{"kind":"Name","value":"brandHeroPrimaryLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"heroSecondaryLabel"},"name":{"kind":"Name","value":"brandHeroSecondaryLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"aboutEyebrow"},"name":{"kind":"Name","value":"brandAboutEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"aboutHeading"},"name":{"kind":"Name","value":"brandAboutHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"whoTitle"},"name":{"kind":"Name","value":"brandWhoTitle"}},{"kind":"Field","alias":{"kind":"Name","value":"whoBody"},"name":{"kind":"Name","value":"brandWhoBody"}},{"kind":"Field","alias":{"kind":"Name","value":"whatTitle"},"name":{"kind":"Name","value":"brandWhatTitle"}},{"kind":"Field","alias":{"kind":"Name","value":"whatBody"},"name":{"kind":"Name","value":"brandWhatBody"}},{"kind":"Field","alias":{"kind":"Name","value":"capabilities"},"name":{"kind":"Name","value":"brandCapabilities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"capability"}}]}},{"kind":"Field","name":{"kind":"Name","value":"brandMetrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metricValue"}},{"kind":"Field","name":{"kind":"Name","value":"metricLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"routesEyebrow"},"name":{"kind":"Name","value":"brandRoutesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"routesHeading"},"name":{"kind":"Name","value":"brandRoutesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"buyerRoutes"},"name":{"kind":"Name","value":"brandBuyerRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"routeDescription"}},{"kind":"Field","name":{"kind":"Name","value":"routeCtaLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsEyebrow"},"name":{"kind":"Name","value":"brandApplicationsEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsHeading"},"name":{"kind":"Name","value":"brandApplicationsHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsIntro"},"name":{"kind":"Name","value":"brandApplicationsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"brandApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"familiesEyebrow"},"name":{"kind":"Name","value":"brandFamiliesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"familiesHeading"},"name":{"kind":"Name","value":"brandFamiliesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"familiesIntro"},"name":{"kind":"Name","value":"brandFamiliesIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"productFamilies"},"name":{"kind":"Name","value":"brandProductFamilies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"selectionEyebrow"},"name":{"kind":"Name","value":"brandSelectionEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionHeading"},"name":{"kind":"Name","value":"brandSelectionHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionIntro"},"name":{"kind":"Name","value":"brandSelectionIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionFactors"},"name":{"kind":"Name","value":"brandSelectionFactors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"resourcesEyebrow"},"name":{"kind":"Name","value":"brandResourcesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"resourcesHeading"},"name":{"kind":"Name","value":"brandResourcesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"technicalResources"},"name":{"kind":"Name","value":"brandTechnicalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resourceTag"}},{"kind":"Field","name":{"kind":"Name","value":"resourceTitle"}},{"kind":"Field","name":{"kind":"Name","value":"resourceDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"processEyebrow"},"name":{"kind":"Name","value":"brandProcessEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"processHeading"},"name":{"kind":"Name","value":"brandProcessHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"evaluationSteps"},"name":{"kind":"Name","value":"brandEvaluationSteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"documentsEyebrow"},"name":{"kind":"Name","value":"brandDocumentsEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"documentsHeading"},"name":{"kind":"Name","value":"brandDocumentsHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"documentsIntro"},"name":{"kind":"Name","value":"brandDocumentsIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"controlledDocuments"},"name":{"kind":"Name","value":"brandControlledDocuments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"documentTitle"}},{"kind":"Field","name":{"kind":"Name","value":"documentContext"}},{"kind":"Field","name":{"kind":"Name","value":"documentAccess"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryEyebrow"},"name":{"kind":"Name","value":"brandInquiryEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryHeading"},"name":{"kind":"Name","value":"brandInquiryHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryIntro"},"name":{"kind":"Name","value":"brandInquiryIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryFields"},"name":{"kind":"Name","value":"brandInquiryFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fieldLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryMessageLabel"},"name":{"kind":"Name","value":"brandInquiryMessageLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySubmitLabel"},"name":{"kind":"Name","value":"brandInquirySubmitLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryHelperText"},"name":{"kind":"Name","value":"brandInquiryHelperText"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySuccessHeading"},"name":{"kind":"Name","value":"brandInquirySuccessHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySuccessMessage"},"name":{"kind":"Name","value":"brandInquirySuccessMessage"}},{"kind":"Field","alias":{"kind":"Name","value":"faqEyebrow"},"name":{"kind":"Name","value":"brandFaqEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"faqHeading"},"name":{"kind":"Name","value":"brandFaqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"brandFaqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"footerDescription"},"name":{"kind":"Name","value":"brandFooterDescription"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}}]} as unknown as DocumentNode<SiteABrandHomepageFieldsFragment, unknown>;
export const MalaysiaHomepageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MalaysiaHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}}]}},{"kind":"Field","name":{"kind":"Name","value":"malaysiaHomepageContractJson"}}]}}]} as unknown as DocumentNode<MalaysiaHomepageFieldsFragment, unknown>;
export const ProductPageCollectionLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}}]} as unknown as DocumentNode<ProductPageCollectionLinkFieldsFragment, unknown>;
export const ProductPageCollectionFaqFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionFaqFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionFaq"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}}]} as unknown as DocumentNode<ProductPageCollectionFaqFieldsFragment, unknown>;
export const ProductPageFamilySummaryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageFamilySummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductFamilySummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"heroImageId"}},{"kind":"Field","name":{"kind":"Name","value":"productCount"}}]}}]} as unknown as DocumentNode<ProductPageFamilySummaryFieldsFragment, unknown>;
export const ProductPageCollectionCardFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionCard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}},{"kind":"Field","name":{"kind":"Name","value":"familyCardSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationFocus"}},{"kind":"Field","name":{"kind":"Name","value":"performanceFocus"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatmentPositioning"}},{"kind":"Field","name":{"kind":"Name","value":"filterTags"}}]}}]} as unknown as DocumentNode<ProductPageCollectionCardFieldsFragment, unknown>;
export const ProductPageSiteScopeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductPageSiteScopeFieldsFragment, unknown>;
export const ProductPageApplicationLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductPageApplicationLinkFieldsFragment, unknown>;
export const ProductPageResourceLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageResourceLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductPageResourceLinkFieldsFragment, unknown>;
export const ProductPageProductLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductPageProductLinkFieldsFragment, unknown>;
export const ProductPageDetailFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"customerProblemHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"quickAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"process"}},{"kind":"Field","name":{"kind":"Name","value":"primaryApplication"}},{"kind":"Field","name":{"kind":"Name","value":"positioning"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatment"}},{"kind":"Field","name":{"kind":"Name","value":"fitWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussFirstWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"performancePriorities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recommendedApplications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceStatement"}},{"kind":"Field","name":{"kind":"Name","value":"typicalProperties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"property"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"validationChecklist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"packaging"}},{"kind":"Field","name":{"kind":"Name","value":"tdsAccess"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageResourceLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageProductLinkFields"}}]}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageResourceLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}}]} as unknown as DocumentNode<ProductPageDetailFieldsFragment, unknown>;
export const ProductSiteScopeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductSiteScopeFieldsFragment, unknown>;
export const ProductApplicationLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductApplicationLinkFieldsFragment, unknown>;
export const ProductDocumentLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductDocumentLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductDocumentLinkFieldsFragment, unknown>;
export const ProductLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProductLinkFieldsFragment, unknown>;
export const SiteProductFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteProductFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"customerProblemHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"quickAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"process"}},{"kind":"Field","name":{"kind":"Name","value":"primaryApplication"}},{"kind":"Field","name":{"kind":"Name","value":"positioning"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatment"}},{"kind":"Field","name":{"kind":"Name","value":"fitWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussFirstWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"performancePriorities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recommendedApplications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceStatement"}},{"kind":"Field","name":{"kind":"Name","value":"typicalProperties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"property"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"validationChecklist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"packaging"}},{"kind":"Field","name":{"kind":"Name","value":"tdsAccess"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductDocumentLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductLinkFields"}}]}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductDocumentLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}}]} as unknown as DocumentNode<SiteProductFieldsFragment, unknown>;
export const ContentPageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Page"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishingFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"publicPath"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ContentPageFieldsFragment, unknown>;
export const ResourceSiteScopeFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ResourceSiteScopeFieldsFragment, unknown>;
export const ResourceEditorialLinkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}}]} as unknown as DocumentNode<ResourceEditorialLinkFieldsFragment, unknown>;
export const SiteTechnicalResourceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteTechnicalResourceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteATechnicalResourceFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"resourceKind"}},{"kind":"Field","name":{"kind":"Name","value":"cluster"}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"keyTakeaways"}},{"kind":"Field","name":{"kind":"Name","value":"sections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"heading"}},{"kind":"Field","name":{"kind":"Name","value":"html"}}]}},{"kind":"Field","name":{"kind":"Name","value":"comparisonTable"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cells"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"practicalImplications"}},{"kind":"Field","name":{"kind":"Name","value":"commonMistakes"}},{"kind":"Field","name":{"kind":"Name","value":"evaluationMethod"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answerHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}}]} as unknown as DocumentNode<SiteTechnicalResourceFieldsFragment, unknown>;
export const GetSiteApplicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteApplication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Application"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SiteApplicationFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteApplicationFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteAApplicationFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationId"}},{"kind":"Field","name":{"kind":"Name","value":"applicationLevel"}},{"kind":"Field","name":{"kind":"Name","value":"family"}},{"kind":"Field","name":{"kind":"Name","value":"parentApplication"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"applicationContext"}},{"kind":"Field","name":{"kind":"Name","value":"buyerProblem"}},{"kind":"Field","name":{"kind":"Name","value":"selectionFactors"}},{"kind":"Field","name":{"kind":"Name","value":"powderDataLimits"}},{"kind":"Field","name":{"kind":"Name","value":"validationPlan"}},{"kind":"Field","name":{"kind":"Name","value":"customerInputs"}},{"kind":"Field","name":{"kind":"Name","value":"bodySections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"heading"}},{"kind":"Field","name":{"kind":"Name","value":"html"}}]}},{"kind":"Field","name":{"kind":"Name","value":"startingProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"summaryHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answerHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ApplicationEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}}]} as unknown as DocumentNode<GetSiteApplicationQuery, GetSiteApplicationQueryVariables>;
export const GetHomepageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetHomepage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Homepage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroPrimaryLabel"}},{"kind":"Field","name":{"kind":"Name","value":"heroSecondaryLabel"}},{"kind":"Field","name":{"kind":"Name","value":"heroSecondaryPath"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"metrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metricValue"}},{"kind":"Field","name":{"kind":"Name","value":"metricUnit"}},{"kind":"Field","name":{"kind":"Name","value":"metricLabel"}},{"kind":"Field","name":{"kind":"Name","value":"metricContext"}},{"kind":"Field","name":{"kind":"Name","value":"metricClaimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"metricEvidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"productsHeading"}},{"kind":"Field","name":{"kind":"Name","value":"productsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"productRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productTitle"}},{"kind":"Field","name":{"kind":"Name","value":"productSummary"}},{"kind":"Field","name":{"kind":"Name","value":"productPath"}},{"kind":"Field","name":{"kind":"Name","value":"productImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productImageAlt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationsHeading"}},{"kind":"Field","name":{"kind":"Name","value":"applicationsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"applications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationName"}},{"kind":"Field","name":{"kind":"Name","value":"applicationSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationPath"}},{"kind":"Field","name":{"kind":"Name","value":"applicationImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationImageAlt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"inquiryHeading"}},{"kind":"Field","name":{"kind":"Name","value":"inquirySteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inquiryStepTitle"}},{"kind":"Field","name":{"kind":"Name","value":"inquiryStepDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"trustHeading"}},{"kind":"Field","name":{"kind":"Name","value":"trustIntro"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasons"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"trustReasonTitle"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonDescription"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonClaimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"trustReasonEvidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rfqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"rfqIntro"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rfqLabelName"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelCompany"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelCountryRegion"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelWorkEmail"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelBuyerType"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelInterest"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelExpectedQuantity"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelDestination"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelMessage"}},{"kind":"Field","name":{"kind":"Name","value":"rfqLabelPrivacy"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerIndustrialLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerDistributorLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqBuyerOtherLabel"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rfqSubmitLabel"}},{"kind":"Field","name":{"kind":"Name","value":"rfqPrivacyText"}},{"kind":"Field","name":{"kind":"Name","value":"rfqSuccessHeading"}},{"kind":"Field","name":{"kind":"Name","value":"rfqSuccessMessage"}},{"kind":"Field","name":{"kind":"Name","value":"faqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"faqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"faqRelatedLabel"}},{"kind":"Field","name":{"kind":"Name","value":"faqRelatedPath"}}]}},{"kind":"Field","name":{"kind":"Name","value":"closingHeading"}},{"kind":"Field","name":{"kind":"Name","value":"closingBody"}},{"kind":"Field","name":{"kind":"Name","value":"closingLabel"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ogImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}}]}}]} as unknown as DocumentNode<GetHomepageQuery, GetHomepageQueryVariables>;
export const GetSiteAEditorialHomepageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteAEditorialHomepage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Homepage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SiteAEditorialHomepageFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteAEditorialHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"closingHeading"}},{"kind":"Field","name":{"kind":"Name","value":"closingBody"}},{"kind":"Field","name":{"kind":"Name","value":"closingLabel"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"ogImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"editorialGeoFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"headerRfqLabel"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerLead"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswerBody"}},{"kind":"Field","name":{"kind":"Name","value":"decisionQuestions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"decisionNumber"}},{"kind":"Field","name":{"kind":"Name","value":"decisionQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"decisionAnswer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applicationBriefs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applicationName"}},{"kind":"Field","name":{"kind":"Name","value":"applicationSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationConsiderations"}}]}},{"kind":"Field","name":{"kind":"Name","value":"supplyRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routeName"}},{"kind":"Field","name":{"kind":"Name","value":"routeMeaning"}},{"kind":"Field","name":{"kind":"Name","value":"buyerVerification"}},{"kind":"Field","name":{"kind":"Name","value":"documentationContext"}},{"kind":"Field","name":{"kind":"Name","value":"claimBasis"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"documentType"}},{"kind":"Field","name":{"kind":"Name","value":"documentTitle"}},{"kind":"Field","name":{"kind":"Name","value":"documentSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicability"}},{"kind":"Field","name":{"kind":"Name","value":"revisionLabel"}},{"kind":"Field","name":{"kind":"Name","value":"evidenceUrl"}},{"kind":"Field","name":{"kind":"Name","value":"verificationStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"evaluationSteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"methodNumber"}},{"kind":"Field","name":{"kind":"Name","value":"methodTitle"}},{"kind":"Field","name":{"kind":"Name","value":"methodDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geoFaqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"glossaryItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"term"}},{"kind":"Field","name":{"kind":"Name","value":"definition"}}]}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewedAt"}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewedBy"}},{"kind":"Field","name":{"kind":"Name","value":"editorialReviewScope"}}]}}]}}]} as unknown as DocumentNode<GetSiteAEditorialHomepageQuery, GetSiteAEditorialHomepageQueryVariables>;
export const GetSiteABrandHomepageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteABrandHomepage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Homepage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SiteABrandHomepageFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"HomepageMediaItemFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"MediaItem"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaItemUrl"}},{"kind":"Field","name":{"kind":"Name","value":"altText"}},{"kind":"Field","name":{"kind":"Name","value":"mediaDetails"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteABrandHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}},{"kind":"Field","name":{"kind":"Name","value":"heroEyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"heroHeading"}},{"kind":"Field","name":{"kind":"Name","value":"heroSummary"}},{"kind":"Field","name":{"kind":"Name","value":"heroImage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"HomepageMediaItemFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"heroImageAlt"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}},{"kind":"Field","name":{"kind":"Name","value":"primaryTopic"}},{"kind":"Field","name":{"kind":"Name","value":"secondaryTopics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"secondaryTopic"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"brandHomepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"heroPrimaryLabel"},"name":{"kind":"Name","value":"brandHeroPrimaryLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"heroSecondaryLabel"},"name":{"kind":"Name","value":"brandHeroSecondaryLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"aboutEyebrow"},"name":{"kind":"Name","value":"brandAboutEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"aboutHeading"},"name":{"kind":"Name","value":"brandAboutHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"whoTitle"},"name":{"kind":"Name","value":"brandWhoTitle"}},{"kind":"Field","alias":{"kind":"Name","value":"whoBody"},"name":{"kind":"Name","value":"brandWhoBody"}},{"kind":"Field","alias":{"kind":"Name","value":"whatTitle"},"name":{"kind":"Name","value":"brandWhatTitle"}},{"kind":"Field","alias":{"kind":"Name","value":"whatBody"},"name":{"kind":"Name","value":"brandWhatBody"}},{"kind":"Field","alias":{"kind":"Name","value":"capabilities"},"name":{"kind":"Name","value":"brandCapabilities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"capability"}}]}},{"kind":"Field","name":{"kind":"Name","value":"brandMetrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"metricValue"}},{"kind":"Field","name":{"kind":"Name","value":"metricLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"routesEyebrow"},"name":{"kind":"Name","value":"brandRoutesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"routesHeading"},"name":{"kind":"Name","value":"brandRoutesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"buyerRoutes"},"name":{"kind":"Name","value":"brandBuyerRoutes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"routeTitle"}},{"kind":"Field","name":{"kind":"Name","value":"routeDescription"}},{"kind":"Field","name":{"kind":"Name","value":"routeCtaLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsEyebrow"},"name":{"kind":"Name","value":"brandApplicationsEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsHeading"},"name":{"kind":"Name","value":"brandApplicationsHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"applicationsIntro"},"name":{"kind":"Name","value":"brandApplicationsIntro"}},{"kind":"Field","name":{"kind":"Name","value":"brandApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"familiesEyebrow"},"name":{"kind":"Name","value":"brandFamiliesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"familiesHeading"},"name":{"kind":"Name","value":"brandFamiliesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"familiesIntro"},"name":{"kind":"Name","value":"brandFamiliesIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"productFamilies"},"name":{"kind":"Name","value":"brandProductFamilies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"selectionEyebrow"},"name":{"kind":"Name","value":"brandSelectionEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionHeading"},"name":{"kind":"Name","value":"brandSelectionHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionIntro"},"name":{"kind":"Name","value":"brandSelectionIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"selectionFactors"},"name":{"kind":"Name","value":"brandSelectionFactors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"resourcesEyebrow"},"name":{"kind":"Name","value":"brandResourcesEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"resourcesHeading"},"name":{"kind":"Name","value":"brandResourcesHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"technicalResources"},"name":{"kind":"Name","value":"brandTechnicalResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resourceTag"}},{"kind":"Field","name":{"kind":"Name","value":"resourceTitle"}},{"kind":"Field","name":{"kind":"Name","value":"resourceDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"processEyebrow"},"name":{"kind":"Name","value":"brandProcessEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"processHeading"},"name":{"kind":"Name","value":"brandProcessHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"evaluationSteps"},"name":{"kind":"Name","value":"brandEvaluationSteps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"itemTitle"}},{"kind":"Field","name":{"kind":"Name","value":"itemDescription"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"documentsEyebrow"},"name":{"kind":"Name","value":"brandDocumentsEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"documentsHeading"},"name":{"kind":"Name","value":"brandDocumentsHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"documentsIntro"},"name":{"kind":"Name","value":"brandDocumentsIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"controlledDocuments"},"name":{"kind":"Name","value":"brandControlledDocuments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"documentTitle"}},{"kind":"Field","name":{"kind":"Name","value":"documentContext"}},{"kind":"Field","name":{"kind":"Name","value":"documentAccess"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryEyebrow"},"name":{"kind":"Name","value":"brandInquiryEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryHeading"},"name":{"kind":"Name","value":"brandInquiryHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryIntro"},"name":{"kind":"Name","value":"brandInquiryIntro"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryFields"},"name":{"kind":"Name","value":"brandInquiryFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fieldLabel"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryMessageLabel"},"name":{"kind":"Name","value":"brandInquiryMessageLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySubmitLabel"},"name":{"kind":"Name","value":"brandInquirySubmitLabel"}},{"kind":"Field","alias":{"kind":"Name","value":"inquiryHelperText"},"name":{"kind":"Name","value":"brandInquiryHelperText"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySuccessHeading"},"name":{"kind":"Name","value":"brandInquirySuccessHeading"}},{"kind":"Field","alias":{"kind":"Name","value":"inquirySuccessMessage"},"name":{"kind":"Name","value":"brandInquirySuccessMessage"}},{"kind":"Field","alias":{"kind":"Name","value":"faqEyebrow"},"name":{"kind":"Name","value":"brandFaqEyebrow"}},{"kind":"Field","alias":{"kind":"Name","value":"faqHeading"},"name":{"kind":"Name","value":"brandFaqHeading"}},{"kind":"Field","name":{"kind":"Name","value":"brandFaqs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"faqQuestion"}},{"kind":"Field","name":{"kind":"Name","value":"faqAnswer"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"footerDescription"},"name":{"kind":"Name","value":"brandFooterDescription"}}]}}]}}]} as unknown as DocumentNode<GetSiteABrandHomepageQuery, GetSiteABrandHomepageQueryVariables>;
export const GetMalaysiaHomepageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMalaysiaHomepage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Homepage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MalaysiaHomepageFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MalaysiaHomepageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Homepage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"homepageFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"homepageSchemaVersion"},"name":{"kind":"Name","value":"schemaVersion"}}]}},{"kind":"Field","name":{"kind":"Name","value":"malaysiaHomepageContractJson"}}]}}]} as unknown as DocumentNode<GetMalaysiaHomepageQuery, GetMalaysiaHomepageQueryVariables>;
export const GetMalaysiaMarketHubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMalaysiaMarketHub"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"malaysiaMarketHubRecordJson"}}]}}]} as unknown as DocumentNode<GetMalaysiaMarketHubQuery, GetMalaysiaMarketHubQueryVariables>;
export const GetMalaysiaProductDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMalaysiaProductDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"malaysiaProductDetailRecordJson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}]}]}}]} as unknown as DocumentNode<GetMalaysiaProductDetailQuery, GetMalaysiaProductDetailQueryVariables>;
export const GetMalaysiaProductHubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMalaysiaProductHub"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"malaysiaProductHubRecordJson"}}]}}]} as unknown as DocumentNode<GetMalaysiaProductHubQuery, GetMalaysiaProductHubQueryVariables>;
export const GetSiteProductsHubDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteProductsHub"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2ProductsHub"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"heroImageId"}},{"kind":"Field","name":{"kind":"Name","value":"decisionRail"}},{"kind":"Field","name":{"kind":"Name","value":"familyCount"}},{"kind":"Field","name":{"kind":"Name","value":"productCount"}},{"kind":"Field","name":{"kind":"Name","value":"families"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageFamilySummaryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"knownGradeHeading"}},{"kind":"Field","name":{"kind":"Name","value":"knownGradeHelp"}},{"kind":"Field","name":{"kind":"Name","value":"decisionPath"}},{"kind":"Field","name":{"kind":"Name","value":"applicationBoundary"}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"enquiry"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionFaqFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageFamilySummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductFamilySummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"heroImageId"}},{"kind":"Field","name":{"kind":"Name","value":"productCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionFaqFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionFaq"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}}]} as unknown as DocumentNode<GetSiteProductsHubQuery, GetSiteProductsHubQueryVariables>;
export const GetSiteProductFamilyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteProductFamily"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2ProductFamily"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"siteId"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"heroImageId"}},{"kind":"Field","name":{"kind":"Name","value":"decisionRail"}},{"kind":"Field","name":{"kind":"Name","value":"filters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"label"}}]}},{"kind":"Field","name":{"kind":"Name","value":"comparisonIntroduction"}},{"kind":"Field","name":{"kind":"Name","value":"comparisonCaption"}},{"kind":"Field","name":{"kind":"Name","value":"selectionMethod"}},{"kind":"Field","name":{"kind":"Name","value":"validationSteps"}},{"kind":"Field","name":{"kind":"Name","value":"products"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionCardFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"applications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"enquiry"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageCollectionFaqFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionCardFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionCard"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}},{"kind":"Field","name":{"kind":"Name","value":"familyCardSummary"}},{"kind":"Field","name":{"kind":"Name","value":"applicationFocus"}},{"kind":"Field","name":{"kind":"Name","value":"performanceFocus"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatmentPositioning"}},{"kind":"Field","name":{"kind":"Name","value":"filterTags"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageCollectionFaqFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2ProductCollectionFaq"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}}]} as unknown as DocumentNode<GetSiteProductFamilyQuery, GetSiteProductFamilyQueryVariables>;
export const GetSiteProductDetailPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteProductDetailPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageDetailFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tio2ProductSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inquiryFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"guidance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"requestTdsCta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussApplicationCta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageResourceLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductPageDetailFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"customerProblemHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"quickAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"process"}},{"kind":"Field","name":{"kind":"Name","value":"primaryApplication"}},{"kind":"Field","name":{"kind":"Name","value":"positioning"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatment"}},{"kind":"Field","name":{"kind":"Name","value":"fitWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussFirstWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"performancePriorities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recommendedApplications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceStatement"}},{"kind":"Field","name":{"kind":"Name","value":"typicalProperties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"property"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"validationChecklist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"packaging"}},{"kind":"Field","name":{"kind":"Name","value":"tdsAccess"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageResourceLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"8"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductPageProductLinkFields"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetSiteProductDetailPageQuery, GetSiteProductDetailPageQueryVariables>;
export const GetSiteProductDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteProduct"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Product"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SiteProductFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tio2ProductSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"siteId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inquiryFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"guidance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"requestTdsCta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussApplicationCta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductApplicationLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductDocumentLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProductLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"uri"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteProductFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"productFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"productId"}},{"kind":"Field","name":{"kind":"Name","value":"family"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"customerProblemHeadline"}},{"kind":"Field","name":{"kind":"Name","value":"quickAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"productType"}},{"kind":"Field","name":{"kind":"Name","value":"process"}},{"kind":"Field","name":{"kind":"Name","value":"primaryApplication"}},{"kind":"Field","name":{"kind":"Name","value":"positioning"}},{"kind":"Field","name":{"kind":"Name","value":"surfaceTreatment"}},{"kind":"Field","name":{"kind":"Name","value":"fitWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"discussFirstWhen"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"performancePriorities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"recommendedApplications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"evidenceStatement"}},{"kind":"Field","name":{"kind":"Name","value":"typicalProperties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"property"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"method"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"displayOrder"}}]}},{"kind":"Field","name":{"kind":"Name","value":"validationChecklist"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"item"}}]}},{"kind":"Field","name":{"kind":"Name","value":"packaging"}},{"kind":"Field","name":{"kind":"Name","value":"tdsAccess"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answer"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"applications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Application"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductApplicationLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"resources"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductDocumentLinkFields"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"products"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"13"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Product"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProductLinkFields"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetSiteProductQuery, GetSiteProductQueryVariables>;
export const GetContentByPathDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContentByPath"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"uri"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"page"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"uri"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"URI"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentPageFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Page"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishingFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"publicPath"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetContentByPathQuery, GetContentByPathQueryVariables>;
export const GetContentPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContentPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"siteScope"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"siteId"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentPageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"endCursor"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Page"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"content"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"format"},"value":{"kind":"EnumValue","value":"RENDERED"}}]},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"publishingFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"publicPath"}},{"kind":"Field","name":{"kind":"Name","value":"seoTitle"}},{"kind":"Field","name":{"kind":"Name","value":"seoDescription"}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<GetContentPageQuery, GetContentPageQueryVariables>;
export const GetSiteTechnicalResourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSiteTechnicalResource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tio2Document"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}},{"kind":"Argument","name":{"kind":"Name","value":"idType"},"value":{"kind":"EnumValue","value":"SLUG"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SiteTechnicalResourceFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceSiteScopeFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SiteScope"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ResourceEditorialLinkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2EditorialLink"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetKey"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SiteTechnicalResourceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tio2Document"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"modifiedGmt"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"siteScopes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceSiteScopeFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"siteATechnicalResourceFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resourceId"}},{"kind":"Field","name":{"kind":"Name","value":"resourceKind"}},{"kind":"Field","name":{"kind":"Name","value":"cluster"}},{"kind":"Field","name":{"kind":"Name","value":"metaTitle"}},{"kind":"Field","name":{"kind":"Name","value":"metaDescription"}},{"kind":"Field","name":{"kind":"Name","value":"eyebrow"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"directAnswer"}},{"kind":"Field","name":{"kind":"Name","value":"keyTakeaways"}},{"kind":"Field","name":{"kind":"Name","value":"sections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"heading"}},{"kind":"Field","name":{"kind":"Name","value":"html"}}]}},{"kind":"Field","name":{"kind":"Name","value":"comparisonTable"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cells"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"practicalImplications"}},{"kind":"Field","name":{"kind":"Name","value":"commonMistakes"}},{"kind":"Field","name":{"kind":"Name","value":"evaluationMethod"}},{"kind":"Field","name":{"kind":"Name","value":"faqItems"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"question"}},{"kind":"Field","name":{"kind":"Name","value":"answerHtml"}}]}},{"kind":"Field","name":{"kind":"Name","value":"childResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedApplications"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedResources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"relatedProducts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ResourceEditorialLinkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ctas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"href"}}]}},{"kind":"Field","name":{"kind":"Name","value":"technicalDisclaimer"}}]}}]}}]} as unknown as DocumentNode<GetSiteTechnicalResourceQuery, GetSiteTechnicalResourceQueryVariables>;