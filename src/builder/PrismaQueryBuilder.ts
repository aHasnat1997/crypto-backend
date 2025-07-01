import { Prisma } from '@prisma/client';

// Define helper types for select and include
type Select<T> = Partial<Record<keyof T, boolean>>; // Type for specifying fields to select
type Include<T> = Partial<Record<keyof T, boolean>>; // Type for specifying relations to include
type OrderByInput = Prisma.SortOrder; // Type for specifying sorting order (ascending or descending)

/**
 * A class for dynamically building Prisma queries.
 * @template TModel - Type of the model being queried.
 * @template TWhereInput - Type for the `where` condition in the query.
 * @template TOrderByInput - Type for the `orderBy` condition in the query.
 * @template TSelect - Type for the fields to select.
 * @template TInclude - Type for the relations to include.
 */
class PrismaQueryBuilder<
  TModel, // The type of the Prisma model being queried
  TWhereInput, // The type for `where` conditions in the query
  TOrderByInput, // The type for `orderBy` conditions in the query
  TSelect, // The type for fields to select
  TInclude // The type for relations to include
> {
  private query: Record<string, any> = {}; // Stores the query parameters
  private select?: Select<TSelect>; // Specifies which fields to select
  private include?: TInclude; // Specifies which relations to include
  private where?: TWhereInput; // Specifies the conditions for filtering results
  private orderBy?: Record<string, OrderByInput>; // Specifies the sorting order
  private skip?: number; // Number of records to skip (for pagination)
  private take?: number; // Number of records to take (for pagination)

  /**
   * Creates an instance of PrismaQueryBuilder.
   * @param prismaDelegate - Object containing Prisma methods for querying and counting.
   * @param query - Query parameters object.
   */
  constructor(
    private prismaDelegate: {
      findMany: (args: any) => Prisma.PrismaPromise<any[]>; // Method to find multiple records
      count: (args: any) => Prisma.PrismaPromise<number>; // Method to count records
    },
    query: Record<string, any> // Query parameters object
  ) {
    this.query = query; // Initialize the query parameters with the provided query object
  }

  // to-do: enum field not working
  /**
   * Adds search functionality to the query based on specified fields.
   * @param searchableFields - Array of fields to search.
   * @returns - Returns the current instance for method chaining.
   */
  search(searchableFields: string[]) {
    const searchTerm = this.query.searchTerm as string | undefined; // Extract search term from query
    if (searchTerm) {
      this.where = {
        OR: searchableFields.map(field => {
          const fieldParts = field.split('.'); // Split field by dot to handle nested fields

          if (fieldParts.length > 1) {
            // Handle nested relations, e.g., user.firstName
            return {
              [fieldParts[0]]: {
                [fieldParts[1]]: { contains: searchTerm, mode: 'insensitive' } // Search term case-insensitive
              }
            };
          } else {
            // Handle normal fields
            return {
              [field]: { contains: searchTerm, mode: 'insensitive' } // Search term case-insensitive
            };
          }
        }) as any,
      } as TWhereInput; // Assign the built where condition
    }
    return this; // Return the current instance for method chaining
  }

  /**
  * Adds filtering functionality to the query based on provided query parameters and enum fields.
  * @param enumFields - Array of field names that are enums.
  * @param additionalFilters - Optional additional filters to include in the query.
  * @returns - Returns the current instance for method chaining.
  */
  filter(enumFields: string[] = [], additionalFilters?: Partial<TWhereInput>) {
    const queryObj = { ...this.query }; // Copy the query parameters to avoid mutating the original object
    const excludeFields = ['searchTerm', 'sort', 'limit', 'page', 'fields']; // Fields to exclude from filters
    excludeFields.forEach(field => delete queryObj[field]); // Remove excluded fields from the query object
    // Dynamically build the `where` condition from remaining query parameters
    const filters = Object.keys(queryObj).reduce((acc, key) => {
      const value = queryObj[key];
      if (value !== undefined) {
        if (key.includes('.')) {
          // Handle nested fields (e.g., 'user.firstName')
          const [relation, subField] = key.split('.');
          acc[relation] = {
            ...acc[relation],
            [subField]: enumFields.includes(key) // Check if it's an enum field
              ? { equals: value } // Exact match for enums
              : { contains: value, mode: 'insensitive' }, // Case-insensitive for others
          };
        } else {
          acc[key] = enumFields.includes(key) // Check if it's an enum field
            ? { equals: value } // Exact match for enums
            : { contains: value, mode: 'insensitive' };
        }
      }
      return acc;
    }, {} as any);

    this.where = { ...this.where, ...filters, ...additionalFilters } as TWhereInput; // Combine existing where conditions with new filters
    return this; // Return the current instance for method chaining
  }

  /**
 * Adds sorting functionality to the query.
 * Defaults to sorting by `createdAt` in descending order if no sort parameter is provided.
 * @returns - Returns the current instance for method chaining.
 */
  sort() {
    const sort = this.query.sort as string | undefined; // Extract sort parameter from query
    if (sort) {
      this.orderBy = sort.split(',').reduce((acc, field) => {
        const [key, order] = field.trim().split(' '); // Split field and order
        // Convert order to lowercase and ensure it matches the expected Prisma SortOrder type
        const validOrder: OrderByInput = (order || 'asc').toLowerCase() as OrderByInput;
        // Ensure key is a valid string
        if (key) {
          acc[key] = validOrder;
        }

        return acc;
      }, {} as Record<string, OrderByInput>); // Create a record of order by fields
    } else {
      // Default sorting to `createdAt` in descending order
      this.orderBy = { createdAt: 'desc' as OrderByInput };
    }
    return this; // Return the current instance for method chaining
  }

  /**
   * Adds pagination functionality to the query.
   * @returns - Returns the current instance for method chaining.
   */
  paginate() {
    const page = Number(this.query.page) || 1; // Extract page number from query or default to 1
    const limit = Number(this.query.limit) || 10; // Extract limit from query or default to 10
    this.skip = (page - 1) * limit; // Calculate the number of records to skip for pagination
    this.take = limit; // Set the number of records to take per page
    return this; // Return the current instance for method chaining
  }

  // to-do: Not working
  /**
   * Specifies which fields to select in the query results.
   * @param {string[]} fields - Array of field names to select.
   * @returns - Returns the current instance for method chaining.
   */
  fields(fields: string[]) {
    if (fields.length > 0) {
      this.select = fields.reduce((acc, field) => {
        const parts = field.split('.'); // Split field by dot to handle nested fields
        if (parts.length > 1) {
          const [relation, subField] = parts;
          // Ensure the relation object exists and is correctly typed
          if (!acc[relation as keyof TSelect]) {
            (acc[relation as keyof TSelect] as any) = {};
          }
          // Type assertion for nested select structure
          (acc[relation as keyof TSelect] as any)[subField] = true;
        } else {
          acc[field as keyof TSelect] = true; // Mark the field as selected
        }
        return acc;
      }, {} as Select<TSelect>); // Build the select object
    }
    return this; // Return the current instance for method chaining
  }

  /**
   * Specifies which relations to include in the query results.
   * @param {TInclude} include - Object specifying relations to include.
   * @returns - Returns the current instance for method chaining.
   */
  includeRelations(include: TInclude) {
    this.include = include; // Set the relations to include in the query
    return this; // Return the current instance for method chaining
  }

  /**
   * Executes the query and retrieves the results.
   * @returns {Promise<any[]>} - A promise that resolves to the query results.
   */
  async findMany(): Promise<any[]> {
    return this.prismaDelegate.findMany({
      where: this.where, // Apply filters to the query
      orderBy: this.orderBy, // Apply sorting to the query
      skip: this.skip, // Apply pagination (skip)
      take: this.take, // Apply pagination (limit)
      select: this.select, // Apply field selection
      include: this.include, // Apply relations inclusion
    });
  }

  /**
   * Retrieves metadata about the query results, such as total count and pagination information.
   * @returns {Promise<{ page: number, limit: number, total: number, totalPage: number }>} - A promise that resolves to an object containing metadata.
   */
  async metaData(): Promise<{ page: number, limit: number, total: number, totalPage: number }> {
    const total = await this.prismaDelegate.count({
      where: this.where, // Count the total number of records matching the filters
    });
    const page = Number(this.query.page) || 1; // Extract page number from query or default to 1
    const limit = Number(this.query.limit) || 10; // Extract limit from query or default to 10
    const totalPage = Math.ceil(total / limit); // Calculate total number of pages

    return {
      page, // Current page number
      limit, // Number of records per page
      total, // Total number of records
      totalPage, // Total number of pages
    };
  }
}

export default PrismaQueryBuilder; // Export the class for use in other modules
